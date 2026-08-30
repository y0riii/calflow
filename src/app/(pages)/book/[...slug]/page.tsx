import React from 'react';
import BookingClient from './BookingClient';

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const resolvedParams = await params;
  const slugParts = resolvedParams.slug || [];

  let username: string | undefined = undefined;
  let eventSlug = '';

  if (slugParts.length === 1) {
    eventSlug = slugParts[0];
  } else if (slugParts.length >= 2) {
    username = slugParts[0];
    eventSlug = slugParts[1];
  }

  return <BookingClient username={username} eventSlug={eventSlug} />;
}
