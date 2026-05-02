// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://honker.dev',
  integrations: [
    starlight({
      title: 'Honker',
      description:
        'Durable queues, streams, pub/sub, and scheduler on SQLite. One file, zero servers.',
      logo: {
        src: './src/assets/honker.png',
        // Keep the "Honker" wordmark beside the mark rather than
        // replacing it. replacesTitle: true would hide the text.
        replacesTitle: false,
      },
      favicon: '/favicon.png',
      head: [
        // Standard apple touch icon for when iOS users save-to-homescreen.
        {
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        },
        // og:image for link unfurls (HN / Twitter / Slack).
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: '/og-image.png' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:card', content: 'summary' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:image', content: '/og-image.png' },
        },
      ],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/russellromney/honker' },
      ],
      components: {
        // Inject a prose "Docs" link into the left-side site-title area.
        // Starlight's default header puts social icons + the theme
        // toggle on the right; our earlier right-side placement
        // overlapped the theme toggle.
        SiteTitle: './src/components/SiteTitle.astro',
        // Prepend a GitHub star-count badge to the social-icons cluster.
        // Stars are fetched at build time via the public GH API.
        SocialIcons: './src/components/SocialIcons.astro',
      },
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Home', slug: 'index' },
            { label: 'Docs overview', slug: 'docs' },
            { label: 'Getting started', slug: 'getting-started' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Queues', slug: 'guides/queues' },
            { label: 'Tasks (decorators)', slug: 'guides/tasks' },
            { label: 'Streams', slug: 'guides/streams' },
            { label: 'Pub/Sub', slug: 'guides/pubsub' },
            { label: 'Scheduler', slug: 'guides/scheduler' },
            {
              label: 'Using with an ORM',
              items: [
                { label: 'Overview', slug: 'guides/orm' },
                { label: 'Python', slug: 'guides/orm/python' },
                { label: 'JavaScript / TypeScript', slug: 'guides/orm/javascript' },
                { label: 'Rust', slug: 'guides/orm/rust' },
                { label: 'Go', slug: 'guides/orm/go' },
                { label: 'Ruby', slug: 'guides/orm/ruby' },
                { label: 'Elixir', slug: 'guides/orm/elixir' },
                { label: '.NET / C#', slug: 'guides/orm/dotnet' },
                { label: 'C++', slug: 'guides/orm/cpp' },
              ],
            },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Binding support', slug: 'reference/bindings' },
            { label: 'Benchmarks', slug: 'reference/benchmarks' },
            { label: 'SQL functions (extension)', slug: 'reference/extension' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
