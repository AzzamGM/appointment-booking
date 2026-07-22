# Visitor analytics

Every page view is written to the `Visit` table. Nothing else needs to run — no dashboard,
no export job.

## Render — live stream

Each recorded visit prints one line to stdout, visible in the service's **Logs** tab:

```
[visit] /doctors - Riyadh, SA - guest - session 8f2c...
[visit] /staff - Jeddah, SA - user cmru... - session 41ab...
```

Filter the log search box by `[visit]` to see only traffic. Render keeps logs for a limited
window, so treat this as a live view; the table below is the durable record.

## Neon — SQL editor

Paste any of these into the Neon SQL editor.

### Traffic per day

```sql
SELECT date_trunc('day', "createdAt")::date AS day,
       count(*)                             AS views,
       count(DISTINCT "sessionId")          AS visitors
FROM "Visit"
GROUP BY day
ORDER BY day DESC
LIMIT 30;
```

### Visitors by country

```sql
SELECT coalesce(country, 'unknown')  AS country,
       count(*)                      AS views,
       count(DISTINCT "sessionId")   AS visitors
FROM "Visit"
WHERE "createdAt" > now() - interval '30 days'
GROUP BY country
ORDER BY visitors DESC;
```

### Most visited pages

```sql
SELECT path,
       count(*)                     AS views,
       count(DISTINCT "sessionId")  AS visitors
FROM "Visit"
WHERE "createdAt" > now() - interval '30 days'
GROUP BY path
ORDER BY views DESC
LIMIT 20;
```

### Cities within a country

```sql
SELECT city, count(*) AS views
FROM "Visit"
WHERE country = 'SA' AND city IS NOT NULL
GROUP BY city
ORDER BY views DESC;
```

### Recent visits, with the signed-in user where there is one

```sql
SELECT v."createdAt", v.path, v.country, v.city, u."fullName", u.role
FROM "Visit" v
LEFT JOIN "User" u ON u.id = v."userId"
ORDER BY v."createdAt" DESC
LIMIT 100;
```

### Signed-in vs guest traffic

```sql
SELECT CASE WHEN "userId" IS NULL THEN 'guest' ELSE 'signed in' END AS kind,
       count(*)                    AS views,
       count(DISTINCT "sessionId") AS visitors
FROM "Visit"
WHERE "createdAt" > now() - interval '30 days'
GROUP BY kind;
```

## What is stored

| Column      | Notes                                                        |
| ----------- | ------------------------------------------------------------ |
| `sessionId` | Random id per browser tab session. One "visitor" = one id.   |
| `path`      | Route path only, never query strings.                        |
| `country`   | ISO code resolved from IP, cached 24h per IP.                |
| `city`      | Best-effort, often null.                                     |
| `ipHash`    | Salted SHA-256. The raw IP is never stored.                  |
| `userId`    | Set only when the request carried a valid token.             |

## Retention

Rows accumulate one per page view. To keep the table bounded, run periodically:

```sql
DELETE FROM "Visit" WHERE "createdAt" < now() - interval '180 days';
```
