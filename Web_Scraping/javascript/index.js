const fetch = require('node-fetch')
const cheerio = require('cheerio')
require('dotenv').config({ path: '../.env' })
const nodemailer = require('nodemailer')

const wishlist =
    'https://www.amazon.com/hz/wishlist/ls/2J6XL0418J2Y9?ref_=wl_share'

/**
 * Extract the pertinent info from an Amazon wishlist
 * @returns the title, link, and price of wishlist items
 */
const main = async() => {
    const html = await fetchHtml()
        // $ is typical of jquery and is sort of a standard
    const $ = cheerio.load(html)
    let data = {}

    $('#g-items li').each((i, el) => {
        // \s gets whitespace, \s+ eliminates actual spaces between words, and
        // g sets it to global (entire string). Eliminates white space.
        const title = $(el).find('h3').text().replace(/\s\s+/g, '')
        const price = $(el).find('span .a-offscreen').text()
        const href = `https://amazon.com${$(el).find('h3 a').attr('href')}`

        data[i] = { title, price, href }
    })
    return data
}

/**
 * Fetch a url and return its html body if there are no errors.
 * @returns html of the fetched url
 */
const fetchHtml = async() => {
    const response = await fetch(wishlist)
    const body = await response.text()
    if (response.status != 200) throw Error(body.message)
    return body
}

/**
 * Email data collected in the main function
 * This boiler plate was generated by visiting npmjs.com/nodemailer and being
 * redirected to nodemailer.com for documentation, which included a similar
 * example.
 * @param {json} data the wishlist items and their prices
 */
const emailUpdate = async(data) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.GM_USERNAME,
            pass: process.env.GM_PASSWORD,
        },
    })

    let text = ''
    let htmlText = ''
        // Object.values extracts the values of items in JSON
        // Object.keys extracts the keys/names of items in JSON
    for (const item of Object.values(data)) {
        text += `
        ${item.title}
        ${item.href}
        ${item.price}
        `

        htmlText += `
        <a href="${item.href}">${item.title}</a>
        ${item.price}
        `
    }

    const info = await transporter.sendMail({
        from: `"Wishlist Updates" <${process.env.GM_USERNAME}>`,
        to: process.env.GM_RECIPIENT,
        subject: `Wishlist Updates: ${new Date().toDateString()}`,
        text: text,
        // need to use <br> in html for new lines
        html: htmlText.replace(/\s\s+/g, '<br>'),
    })

    console.log('Message sent: %s', info.messageId)
}

main().then(emailUpdate).catch(console.error)