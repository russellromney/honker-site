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
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'SQL functions (extension)', slug: 'reference/extension' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
