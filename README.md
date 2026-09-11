This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment

Keep environment values outside Git. Server-side billing requires `STRIPE_SECRET_KEY` and the applicable price variables:

- `STRIPE_PRICE_PRO_EUR`, `STRIPE_PRICE_PRO_USD`, `STRIPE_PRICE_PRO_GBP`
- `STRIPE_PRICE_YEARLY_EUR`, `STRIPE_PRICE_YEARLY_USD`, `STRIPE_PRICE_YEARLY_GBP`
- `STRIPE_PRICE_FOUNDER_EUR`, `STRIPE_PRICE_FOUNDER_USD`, `STRIPE_PRICE_FOUNDER_GBP`

Set `NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_APP_URL` to the URL of the current environment. Optional OpenAI, Resend, push, and Stripe integrations remain disabled when their server credentials are absent.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
