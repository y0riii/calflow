export async function refreshZoomToken(refreshToken: string) {
  const clientId = process.env.ZOOM_CLIENT_ID || "";
  const clientSecret = process.env.ZOOM_CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    throw new Error("Zoom OAuth credentials (ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET) are not configured.");
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  let response: Response;
  try {
    response = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
  } catch (networkError) {
    throw new Error(`Network error while refreshing Zoom token: ${networkError}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to refresh Zoom token (HTTP ${response.status}): ${body}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token as string,
    newRefreshToken: data.refresh_token as string,
  };
}

export async function createZoomMeeting(
  refreshToken: string,
  details: {
    title: string;
    description: string;
    startsAt: Date;
    durationMins: number;
    timezone: string;
  }
) {
  const { accessToken, newRefreshToken } = await refreshZoomToken(refreshToken);

  let response: Response;
  try {
    response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: details.title,
        type: 2, // Scheduled meeting
        start_time: details.startsAt.toISOString(),
        duration: details.durationMins,
        timezone: "UTC",
        agenda: details.description,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 2,
          audio: "both",
          auto_recording: "none",
        },
      }),
    });
  } catch (networkError) {
    throw new Error(`Network error while creating Zoom meeting: ${networkError}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to create Zoom meeting (HTTP ${response.status}): ${body}`);
  }

  const data = await response.json();
  const meetingUrl = data.join_url as string;
  const providerEventId = String(data.id);

  return { meetingUrl, providerEventId, newRefreshToken };
}

export async function updateZoomMeeting(
  refreshToken: string,
  meetingId: string,
  details: {
    startsAt: Date;
    durationMins: number;
  }
) {
  const { accessToken, newRefreshToken } = await refreshZoomToken(refreshToken);

  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start_time: details.startsAt.toISOString(),
      duration: details.durationMins,
    }),
  });

  if (!response.ok && response.status !== 204) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to update Zoom meeting (HTTP ${response.status}): ${body}`);
  }

  return { newRefreshToken };
}

export async function deleteZoomMeeting(
  refreshToken: string,
  meetingId: string
) {
  const { accessToken, newRefreshToken } = await refreshZoomToken(refreshToken);

  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to delete Zoom meeting (HTTP ${response.status}): ${body}`);
  }

  return { newRefreshToken };
}

