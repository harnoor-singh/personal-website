import rss from '@astrojs/rss'
import siteConfig from '~/site.config'
import type { AstroGlobal } from 'astro'
import { getAllSortedContent } from '~/utils'
import sanitizeHtml from 'sanitize-html'
import MarkdownIt from 'markdown-it'
const parser = new MarkdownIt()

// https://docs.astro.build/en/recipes/rss/
export async function GET(_context: AstroGlobal) {
  if (!siteConfig.site) {
    console.warn(
      'Site URL is required for RSS feed generation. Skipping RSS feed generation.',
    )
    return
  }
  const allContent = await getAllSortedContent()
  return rss({
    stylesheet: '/rss.xsl',
    title: siteConfig.title,
    description: siteConfig.description,
    site: siteConfig.site,
    items: allContent.map((item) => {
      // Determine if it's an essay or post based on the collection
      const isEssay = 'collection' in item && item.collection === 'essays'
      const basePath = isEssay ? '/essays/' : '/posts/'
      
      return {
        title: item.data.title,
        pubDate: item.data.published,
        description: item.data.description,
        author: item.data.author || siteConfig.author,
        link: `${basePath}${item.id}`,
        content: sanitizeHtml(parser.render(item.body || ''), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        }),
      }
    }),
    trailingSlash: false,
  })
}
