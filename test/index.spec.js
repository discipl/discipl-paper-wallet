/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

import { expect } from 'chai'
import { PaperWallet, template } from '../src'
import sinon from 'sinon'
const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')

let pw
let discipl

describe('discipl-paper-wallet', function () {
  this.timeout(5000)
  describe('with the discipl paper wallet component', function () {
    before(() => {
      pw = new PaperWallet()
      discipl = pw.getCore()
    })
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

      let claimT = await discipl.exportLD(claimLink, attestor)

      let vc = await pw.issue(claimLink, attestor, { 'public': 'metadata' })
      expect(vc.version).to.equal(29)
      let canvas = createCanvas(template.canvasWidth, template.canvasHeight, 'pdf')
      await pw.toCanvas(vc, template, canvas)

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

      let validatorSsid = await discipl.newSsid('ephemeral')

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
      expect(JSON.parse(readData.data).claimData).to.deep.equal(claimT)
      expect(JSON.parse(readData.data).metadata).to.deep.equal({ 'public': 'metadata' })
      let result = await pw.validate(attestor.did, readData.data, validatorSsid.did)
      expect(result).to.equal(true)

      let exportedResult = await discipl.exportLD(claimLink, validatorSsid)

      expect(exportedResult).to.deep.equal(claimT)

      result = await pw.validate(attestor.did + '-', readData.data)
      expect(result).to.equal(null)
      result = await pw.validate(attestor.did, readData.data.replace('1234AB', '4321BA'))
      expect(result).to.equal(null)
    })
    it('should be able to issue an attested claim suitable for downloading to wallet', async function () {
      let data =
            [{ 'Naam': 'van Sesamstraat' },
              { 'Voorletters': 'B' },
              { 'Geboortedatum': '1975-05-13' },
              { 'Postcode': '1234AB' },
              { 'Adres': 'Van diepenbrockstraat 36' },
              { 'Plaats': 'Amsterdam' },
              { 'Land': 'Nederland' },
              { 'BSN': '012345678' }]

      let newIdentityStub = sinon.stub().returns('link:discipl:ula-server')
      let getStub = sinon.stub().returns('link:discipl:ula-server:eyJzZXNzaW9uSWQiOiJzZXMtMTE5YTZjZjMtZDhhMy00MmNjLTkwYWYtNzI0MWU4M2JjZWZmIiwicXJjb2RlIjoiaHR0cHM6Ly8weHZ2bXd4ZDZlLmV4ZWN1dGUtYXBpLmV1LXdlc3QtMS5hbWF6b25hd3MuY29tL2Rldi9jaGFsbGVuZ2VzP3Nlc3Npb25JZD1zZXMtMTE5YTZjZjMtZDhhMy00MmNjLTkwYWYtNzI0MWU4M2JjZWZmIiwidHJhbnNhY3Rpb25JZCI6InRyeC04YWRjNDI2MC1mYTllLTRiNDUtODViOC1kYjcwMGM5NDM0MTEifQ==')
      let stubConnector = { newIdentity: newIdentityStub, get: getStub }

      await discipl.registerConnector('ula-server', stubConnector)

      let attestor = await discipl.newSsid('ephemeral')
      let claimLink = await discipl.claim(attestor, data)
      let vc = await pw.issue(claimLink, attestor, { 'public': 'metadata' })

      let attestorWallet = await discipl.newSsid('ula-server')
      let vcWallet = await pw.walletIssue(vc.claimData, attestorWallet)

      expect(vcWallet.version).to.equal(14)
    })
  })
})
