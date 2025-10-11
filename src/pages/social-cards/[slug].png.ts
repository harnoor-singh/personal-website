import siteConfig from '~/site.config'
import { Resvg } from '@resvg/resvg-js'
import type { APIContext, InferGetStaticPropsType } from 'astro'
import satori, { type SatoriOptions } from 'satori'
import { html } from 'satori-html'
import { dateString, getSortedPosts, getSortedEssays, resolveThemeColorStyles } from '~/utils'
import path from 'path'
import fs from 'fs'
import type { ReactNode } from 'react'

// Load the font file as binary data
const fontPath = path.resolve(
  './node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf',
)
const fontData = fs.readFileSync(fontPath) // Reads the file as a Buffer

const avatarPath = path.resolve(siteConfig.socialCardAvatarImage)
let avatarData: Buffer | undefined
let avatarBase64: string | undefined
if (
  fs.existsSync(avatarPath) &&
  (path.extname(avatarPath).toLowerCase() === '.jpg' ||
    path.extname(avatarPath).toLowerCase() === '.jpeg')
) {
  avatarData = fs.readFileSync(avatarPath)
  avatarBase64 = `data:image/jpeg;base64,${avatarData.toString('base64')}`
}

const defaultTheme =
  siteConfig.themes.default === 'auto'
    ? siteConfig.themes.include[0]
    : siteConfig.themes.default

const themeStyles = await resolveThemeColorStyles(
  [defaultTheme],
  siteConfig.themes.overrides,
)
const bg = themeStyles[defaultTheme]?.background
const fg = themeStyles[defaultTheme]?.foreground
const accent = themeStyles[defaultTheme]?.accent

if (!bg || !fg || !accent) {
  throw new Error(`Theme ${defaultTheme} does not have required colors`)
}

const ogOptions: SatoriOptions = {
  // debug: true,
  fonts: [
    {
      data: fontData,
      name: 'JetBrains Mono',
      style: 'normal',
      weight: 400,
    },
  ],
  height: 630,
  width: 1200,
}

const markup = (title: string, pubDate: string | undefined, author: string) => {
  // Simplify the title to avoid potential issues
  const safeTitle = title.replace(/[^\w\s-]/g, '').slice(0, 100)
  
  return html(`<div tw="flex flex-col max-w-full justify-center h-full bg-[${bg}] text-[${fg}] p-12">
    <div style="border-width: 12px; border-radius: 80px;" tw="flex items-center max-w-full p-8 border-[${accent}]/30">
      <div tw="flex flex-1 flex-col max-w-full justify-center items-center">
        ${pubDate ? `<p tw="text-3xl max-w-full text-[${accent}]">${pubDate}</p>` : ''}
        <h1 tw="text-6xl my-14 text-center leading-snug">${safeTitle}</h1>
        ${author !== safeTitle ? `<p tw="text-4xl text-[${accent}]">${author}</p>` : ''}
      </div>
    </div>
  </div>`)
}

type Props = InferGetStaticPropsType<typeof getStaticPaths>

export async function GET(context: APIContext) {
  try {
    const { pubDate, title, author } = context.props as Props
    console.log(`Generating social card for: ${title}`)
    
    const svg = await satori(markup(title, pubDate, author) as ReactNode, ogOptions)
    console.log(`  - SVG generated for: ${title}`)
    
    const png = new Resvg(svg).render().asPng()
    console.log(`  - PNG generated for: ${title}`)
    
    return new Response(new Uint8Array(png), {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'image/png',
      },
    })
  } catch (error) {
    console.error(`Error generating social card:`, error)
    // Return a simple error response
    return new Response('Error generating image', { status: 500 })
  }
}

export async function getStaticPaths() {
  const posts = await getSortedPosts()
  const essays = await getSortedEssays()
  
  // Combine posts and essays
  const allContent = [...posts, ...essays]
  
  console.log(`Generating social cards for ${allContent.length} items`)
  
  return allContent
    .map((item) => {
      console.log(`  - ${item.id}`)
      return {
        params: { slug: item.id },
        props: {
          pubDate: item.data.published ? dateString(item.data.published) : undefined,
          title: item.data.title,
          author: item.data.author || siteConfig.author,
        },
      }
    })
    .concat([
      {
        params: { slug: '__default' },
        props: { pubDate: undefined, title: siteConfig.title, author: siteConfig.author },
      },
    ])
}
