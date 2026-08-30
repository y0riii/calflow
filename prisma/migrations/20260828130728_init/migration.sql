ALTER TABLE "users" ADD CONSTRAINT users_username_len
  CHECK (LENGTH(username) BETWEEN 4 AND 50);

ALTER TABLE "events" ADD CONSTRAINT events_duration_positive
  CHECK ("durationMins" > 0);

ALTER TABLE "availabilities" ADD CONSTRAINT availabilities_day_range
  CHECK ("dayOfWeek" BETWEEN 0 AND 6);

ALTER TABLE "availabilities" ADD CONSTRAINT availabilities_time_order
  CHECK ("startTime" < "endTime");

ALTER TABLE "bookings" ADD CONSTRAINT bookings_time_order
  CHECK ("startsAt" < "endsAt");