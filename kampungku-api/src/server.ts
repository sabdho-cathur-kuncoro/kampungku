import app from './app';
import { env } from './config/env';
import { registerIuranReminderJob } from './jobs/iuranReminder.job';

app.listen(env.PORT, () => {
  console.log(`🚀 KampungKu API berjalan di port ${env.PORT}`);

  if (env.NODE_ENV !== 'test') {
    registerIuranReminderJob();
  }
});
