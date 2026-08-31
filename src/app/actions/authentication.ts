'use server'

import { cookies } from 'next/headers';
import dns from 'dns';
import { promisify } from 'util';
import { loginSchema, registerSchema } from "../schemas/authentication";
import { z } from "zod";
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export type AuthResponse = {
  success: boolean;
  message?: string;
};

// --- LOGIN ACTION ---
export async function loginAction(data: LoginFormData): Promise<AuthResponse> {
  const validation = loginSchema.safeParse(data);
  if (!validation.success) return { success: false, message: "Invalid data." };

  const { email, password, remember } = validation.data;

  try {
    const user = await prisma.user.findUnique({ where: { email: email } });
    if(!user) return { success: false, message: "There is no user with these credentials." };
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return { success: false, message: "There is no user with these credentials." };
    
    const accessSecret = process.env.JWT_ACCESS_SECRET!;
    const refreshSecret = process.env.JWT_REFRESH_SECRET!;
    const accessExpiresIn = parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN || '900', 10);
    
    const cookieStore = await cookies();
    const refreshExpirationTime = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '604800', 10);
    
    if (remember) {
      const tokenExpiresIn = refreshExpirationTime;
      const accessToken = jwt.sign({ userId: user.userId, username: user.username, email: user.email }, accessSecret, { expiresIn: accessExpiresIn });
      const refreshToken = jwt.sign({ userId: user.userId }, refreshSecret, { expiresIn: tokenExpiresIn });
      
      cookieStore.set('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: accessExpiresIn,
      });

      cookieStore.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: refreshExpirationTime,
      });
    } else {
      const ONE_DAY = 86400; 
      const accessToken = jwt.sign({ userId: user.userId, username: user.username, email: user.email }, accessSecret, { expiresIn: ONE_DAY });
      
      cookieStore.set('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        // omit maxAge so it's a session cookie (deleted when browser closes)
      });
      // Ensure no leftover refresh token exists
      cookieStore.delete('refreshToken');
    }

    return { success: true };
  } catch (error) {
    return { success: false, message: "An unexpected error occurred." };
  }
}

// --- REGISTER ACTION ---
export async function registerAction(data: RegisterFormData): Promise<AuthResponse> {
  const validation = registerSchema.safeParse(data);
  if (!validation.success) return { success: false, message: "Invalid form data provided." };

  const { username, email, password } = validation.data;

  // Verify that the email domain actually has MX records (can receive mail)
  try {
    const resolveMx = promisify(dns.resolveMx);
    const spl = email.split('@');
    const domain = spl[spl.length - 1];
    if (domain) {
      const mxRecords = await resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return { success: false, message: "The email address provided is invalid or cannot receive emails." };
      }
    }
  } catch (error) {
    return { success: false, message: "The email address provided is invalid or the domain does not exist." };
  }

  try {
    const existingUser = await prisma.user.findFirst({ 
      where: {
        OR: [
          { email: email },
          { username: username }
        ]
      }
    });
    
    if (existingUser) return { success: false, message: "An account with this email or username already exists." };

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        username: username,
        email: email,
        passwordHash: hashedPassword,
      },
    });
    return { success: true };
    
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, message: "An unexpected error occurred during registration." };
  }
}

// --- LOGOUT ACTION (With Blacklist) ---
export async function logoutAction(): Promise<AuthResponse> {
  const cookieStore = await cookies();

  // Always clear cookies, even if blacklisting the token fails
  try {
    const refreshToken = cookieStore.get('refreshToken')?.value;
    if (refreshToken) {
      const decoded = jwt.decode(refreshToken) as jwt.JwtPayload | null;
      const expiresAt = decoded?.exp 
        ? new Date(decoded.exp * 1000) 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.blacklistedToken.create({
        data: {
          token: refreshToken,
          expiresAt: expiresAt
        }
      });
    }
  } catch (error) {
    // Non-fatal: log and continue — cookies will still be cleared
    console.error("Failed to blacklist refresh token (non-fatal):", error);
  }

  try {
    cookieStore.delete('accessToken');
    cookieStore.delete('refreshToken');
  } catch (error) {
    console.error("Failed to delete auth cookies:", error);
    return { success: false, message: "Failed to log out properly." };
  }

  return { success: true };
}

export async function refreshTokenAction(): Promise<AuthResponse> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) {
      return { success: false, message: "session expired" };
    }

    // 1. Check if token is in the Prisma Blacklist
    const isBlacklisted = await prisma.blacklistedToken.findUnique({
      where: { token: refreshToken },
    });

    if (isBlacklisted) {
      // Revoked token detected: clear cookies immediately
      cookieStore.delete('accessToken');
      cookieStore.delete('refreshToken');
      return { success: false, message: "session expired" };
    }

    // 2. Verify JWT signature & expiration
    const refreshSecret = process.env.JWT_REFRESH_SECRET!;
    let payload: { userId: string };

    try {
      payload = jwt.verify(refreshToken, refreshSecret) as { userId: string };
    } catch (error) {
      // Expired or tampered token
      cookieStore.delete('accessToken');
      cookieStore.delete('refreshToken');
      return { success: false, message: "session expired" };
    }

    // 3. Confirm user still exists in database
    const user = await prisma.user.findUnique({
      where: { userId: parseInt(payload.userId) },
    });

    if (!user) {
      cookieStore.delete('accessToken');
      cookieStore.delete('refreshToken');
      return { success: false, message: "User account no longer exists." };
    }

    // 4. Generate new Access Token
    const accessSecret = process.env.JWT_ACCESS_SECRET!;
    const accessExpiresIn = parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN || '900', 10);

    const newAccessToken = jwt.sign(
      { userId: user.userId, username: user.username, email: user.email }, 
      accessSecret, 
      { expiresIn: accessExpiresIn }
    );

    // 5. Set updated Access Token cookie
    cookieStore.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // allows cookies on top-level navigation like clicking a link from another site but prevents CSRF attacks by not allowing background requests from other sites.
      path: '/',
      maxAge: accessExpiresIn,
    });

    return { success: true };
  } catch (error) {
    console.error("Refresh token error:", error);
    return { success: false, message: "An error occurred while refreshing authentication." };
  }
}

type User = {
    id: string;
    username: string;
    email: string;
    timezone?: string;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) return null;

    // 1. jwt.verify validates AND returns the decoded payload in one step
    const payload = jwt.verify(
      accessToken, 
      process.env.JWT_ACCESS_SECRET!
    ) as jwt.JwtPayload | null;

    // 2. Ensure payload is a valid object containing our claims
    if (!payload || typeof payload !== 'object' || !payload.userId) {
      return null;
    }

    // 3. Fetch timezone from database
    const dbUser = await prisma.user.findUnique({
      where: { userId: typeof payload.userId === 'string' ? parseInt(payload.userId) : payload.userId },
      select: { timezone: true },
    });

    return {
      id: String(payload.userId),
      username: payload.username as string,
      email: payload.email as string,
      timezone: dbUser?.timezone || 'America/New_York',
    };
  } catch (error) {
    return null;
  }
}

export type UpdateUserResponse = {
  success: boolean;
  message?: string;
  user?: User;
};

export async function updateUserAction(data: { username?: string; email?: string; timezone?: string }): Promise<UpdateUserResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: "Not authorized." };
    }

    const userId = parseInt(currentUser.id);
    const updateData: { username?: string; email?: string; timezone?: string } = {};

    if (data.username && data.username !== currentUser.username) {
      const existingUser = await prisma.user.findFirst({
        where: { username: data.username, NOT: { userId } },
      });
      if (existingUser) {
        return { success: false, message: "Username is already taken." };
      }
      updateData.username = data.username;
    }

    if (data.email && data.email !== currentUser.email) {
      return { success: false, message: "Email addresses cannot be updated." };
    }

    if (data.timezone && data.timezone !== currentUser.timezone) {
      updateData.timezone = data.timezone;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true, message: "No profile changes to save." };
    }

    const updatedUser = await prisma.user.update({
      where: { userId },
      data: updateData,
    });

    const accessSecret = process.env.JWT_ACCESS_SECRET!;
    const accessExpiresIn = parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN || '900', 10);
    const newAccessToken = jwt.sign(
      { userId: updatedUser.userId, username: updatedUser.username, email: updatedUser.email },
      accessSecret,
      { expiresIn: accessExpiresIn }
    );
    const cookieStore = await cookies();
    cookieStore.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: accessExpiresIn,
    });

    return {
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser.userId.toString(),
        username: updatedUser.username,
        email: updatedUser.email,
      },
    };
  } catch (error) {
    console.error("Update user error:", error);
    return { success: false, message: "An unexpected error occurred while updating profile." };
  }
}

