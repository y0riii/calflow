export async function refreshGoogleToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Google token");
  }

  const data = await response.json();
  return data.access_token;
}

export async function createGoogleMeet(
  refreshToken: string,
  details: {
    title: string;
    description: string;
    startsAt: Date;
    endsAt: Date;
    guestEmail: string;
  }
) {
  const accessToken = await refreshGoogleToken(refreshToken);

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: details.title,
        description: details.description,
        start: { dateTime: details.startsAt.toISOString() },
        end: { dateTime: details.endsAt.toISOString() },
        attendees: [{ email: details.guestEmail }],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create Google Meet event");
  }

  const data = await response.json();
  const meetingUrl = data.hangoutLink;
  const providerEventId = data.id;

  return { meetingUrl, providerEventId };
}
