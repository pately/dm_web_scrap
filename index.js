const express = require('express');

Handlebars = require('handlebars');
const Nightmare = require('nightmare')
var cheerio = require('cheerio');
const app = express();
const port = process.env.PORT || 4000;

const axios = require('axios');
const parseStringPromise = require('xml2js').parseStringPromise;

const handlebars = require('express-handlebars');

app.set('view engine', 'hbs');
app.engine('hbs', handlebars({
    layoutsDir: __dirname + '/views/layouts',
    extname: 'hbs',
    defaultLayout: 'planB',
    partialsDir: __dirname + '/views/partials/',
    helpers: {
        firstIndex: function (index) { return index === 0; },
        splitQuote: function (splitQuote) {
            string = Handlebars.Utils.escapeExpression(splitQuote);
            return encodeURIComponent(string); // mark as already escaped
        }
    },
}));

app.use(express.static('public'))

const sendGetRequest = async () => {
    try {
        const resp = await axios.get('https://products.dm.de/productfeed/de/sitemap.xml');

        let convert = await parseStringPromise(resp.data);
        return (JSON.parse(JSON.stringify(convert, null, 2)));
    } catch (err) {
        console.error(err);
    }
};


app.get('/', async (req, res) => {
    const result = await sendGetRequest();
    res.render('main', { layout: 'index', suggestedChamps: result.urlset.url, listExists: true });
});

app.get('/product/:url', async (req, res) => {

    var url = decodeURIComponent(req.params.url); 

    const nightmare = Nightmare({
        openDevTools: {
            mode: "detach"
        },
        show: false,
        alwaysOnTop: false
    })

    const promiseme = await nightmare
        .goto(url).evaluate(function () {
            //here is where I want to return the html 
            return document.documentElement.innerHTML

        })
        .end()
        .then((body) => {
            var $ = cheerio.load(body);

            var digit = $('[data-dmid="price-digit"]').text()
            console.log(digit);

            var cent = $('[data-dmid="price-cent"]').text()
            console.log(cent);

            var currency = $('[data-dmid="price-currency"]').text()
            console.log(currency);


            var images = ($('img').map(function () {
                const image = $(this).attr('src');
                if (image.includes('productimage_280x430')) {
                    return image;
                }
            }).get())
            console.log(images);


            var brand = $('[data-dmid="detail-page-headline-brand-name"]').text()
            console.log(brand);


            var product = $('[data-dmid="detail-page-headline-product-title"]').text()
            console.log(product);


            var base = $('[data-dmid="product-base-price"]').first().text()

            console.log(base);


            var selling = $('[data-dmid="description-relevant-selling-points"]').text()
            console.log(selling);

            var produktbeschreibung = $('[data-dmid="description-relevant-selling-points"] li').map(function (i, elm) {
                const li = $(this).text();
                return li;
            }).get()

            console.log(produktbeschreibung);
            return {
                price: `${digit}.${cent} ${currency}`,
                images: images,
                produktbeschreibung,
                base,
                product,
                brand,
                selling

            }

        })
    await res.render('product', { layout: 'index', suggestedChamps: promiseme, listExists: true });
})

app.listen(port, () => console.log(`App listening to port ${port}`));