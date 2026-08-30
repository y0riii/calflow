export async function refreshZoomToken(refreshToken: string) {
  const clientId = process.env.ZOOM_CLIENT_ID || "";
  const clientSecret = process.env.ZOOM_CLIENT_SECRET || "";
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://zoom.us/oauth/token", {
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

  if (!response.ok) {
    throw new Error("Failed to refresh Zoom token");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    newRefreshToken: data.refresh_token, // Zoom refresh tokens often rotate
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

  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
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
        approval_type: 2, // No registration required
        audio: "both",
        auto_recording: "none",
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create Zoom meeting");
  }

  const data = await response.json();
  const meetingUrl = data.join_url;
  const providerEventId = data.id.toString();

  return { meetingUrl, providerEventId, newRefreshToken };
}
