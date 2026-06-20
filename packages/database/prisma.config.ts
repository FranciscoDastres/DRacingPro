import 'dotenv/config';

import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://dracing:dracing@localhost:5432/dracing',
  },
  schema: 'prisma/schema.prisma',
});
