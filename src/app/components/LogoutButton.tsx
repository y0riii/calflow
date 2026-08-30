"use client"

import { getCurrentUser, logoutAction } from '@/app/actions/authentication';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

export default function Page() {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const userData = await getCurrentUser();
      if (userData) {
        setUser(userData);
      } else {
        // If token is missing or invalid, route to login
        router.push("/login");
      }
    };
    checkUser();
  }, [router]);

  async function handleLogout() {
    try {
      const res = await logoutAction();
      if (res?.success) {
        // Redirect to login on successful logout
        router.push("/login");
        router.refresh();
      } else {
        alert(res?.message || "Logout failed. Please try again.");
      }
    } catch (error) {
      alert("An error occurred during logout. Please try again.");
    }
  }

  return (
    <div>
      <button 
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors" 
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
}