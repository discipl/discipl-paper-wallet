/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

import * as pw from '../src/index.js'
import stringify from 'json-stable-stringify'

import { expect } from 'chai'
const { createCanvas, loadImage } = require('canvas')
let discipl = pw.getCore()
const fs = require('fs')

describe('descipl-paper-wallet', function () {
  this.timeout(5000)
  describe('with the discipl paper wallet component', function () {
    it('should be able to issue an attested claim to a document on Canvas, and scan the QR in the document on the canvas and validate it using a given attestor did', async function () {
      let data =
        [{ 'Naam': 'van Sesamstraat' },
          { 'Voorletters': 'B' },
          { 'Geboortedatum': '1975-05-13' },
          { 'Postcode': '1234AB' },
          { 'Adres': 'Van diepenbrockstraat 36' },
          { 'Plaats': 'Amsterdam' },
          { 'Land': 'Nederland' },
          { 'BSN': '012345678' },
          { 'Adres2': 'korteweg 3' },
          { 'Postcode2': '1234AB' },
          { 'Plaats2': 'Leiden' },
          { 'tot2': '01-01-2018' },
          { 'Adres3': 'valida 23' },
          { 'Postcode3': '1243 33' },
          { 'Plaats3': 'Vladiwostok' },
          { 'tot3': '01-01-2017' },
          { 'Adres4': 'paardeweg 36' },
          { 'Postcode4': '0004AB' },
          { 'Plaats4': 'Den haag' },
          { 'tot2': '01-01-2016' },
          { 'Adres5': 'Main street' },
          { 'Postcode5': '1234 UKS' },
          { 'Plaats5': 'LONDON' },
          { 'tot2': '01-01-2015' },
          { 'Adres6': 'Wilhelmina van Pruisenweg 36' },
          { 'Postcode6': '2334AB' },
          { 'Plaats6': 'Grondingen' },
          { 'tot2': '01-01-2014' },
          { 'Adres7': 'Blaak 36' },
          { 'Postcode7': '4234AB' },
          { 'Plaats7': 'Utrecht' },
          { 'tot2': '01-01-2013' },
          { 'Adres8': 'Margrietstraat 36' },
          { 'Postcode8': '9234AB' },
          { 'Plaats8': 'Maastricht' },
          { 'tot2': '01-01-2012' },
          { 'Adres9': 'Wiering 36' },
          { 'Postcode9': '1214AB' },
          { 'Plaats9': 'Zeist' },
          { 'tot2': '01-01-2011' }]

      let attestor = await discipl.newSsid('ephemeral')
      let claimLink = await discipl.claim(attestor, data)

      let claimT = await discipl.exportLD(claimLink)

      let vc = await pw.issue(claimLink)
      let canvas = createCanvas(pw.template.canvasWidth, pw.template.canvasHeight, 'pdf')
      await pw.toCanvas(vc, pw.template, canvas)

      const buff = canvas.toBuffer('application/pdf', {
        title: 'Bewijs inschrijving',
        author: attestor.did,
        subject: '',
        keywords: '',
        creator: 'discipl-paper-wallet',
        creationDate: new Date()
      })

      fs.writeFile('/tmp/vc.pdf', buff, function (err) {
        if (err) throw err
        console.log('created /tmp/vc.pdf')
      })

      // reset ephemeral connector (in memory mode)
      let m = await import('@discipl/core-ephemeral')
      let ConnectorModuleClass = m.default
      discipl.registerConnector('ephemeral', new ConnectorModuleClass())

      let fail = false
      try {
        fail = await discipl.get(claimLink)
      } catch (err) {
        fail = null
      }
      expect(fail).to.equal(null)

      let canvasReader = createCanvas(800, 800)
      let ctx = canvasReader.getContext('2d')
      let scan = await loadImage(vc.qr)
      ctx.drawImage(scan, 10, 10)
      let readData = await pw.fromCanvas(canvasReader)
      expect(stringify(JSON.parse(readData.data))).to.deep.equal(stringify(claimT))
      let result = await pw.validate(attestor.did, readData.data)
      expect(result).to.equal(true)
      result = await pw.validate(attestor.did + '-', readData.data)
      expect(result).to.equal(null)
      result = await pw.validate(attestor.did, readData.data.replace('1234AB', '4321BA'))
      expect(result).to.equal(null)
    })
  })
})
