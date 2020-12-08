
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import stringify from 'json-stable-stringify'
import { loadImage } from 'canvas'
import { CanvasTextWrapper } from 'canvas-text-wrapper'
import { DisciplCore } from '@discipl/core'

/**
 * a default template
 */
const template = {
  backgroundImage: 'images/template.png',
  logoImage: 'images/logo.png',
  disciplImage: 'discipl.svg',
  logoWidth: 150,
  logoHeight: 150,
  canvasWidth: 595, // 8.27 inch @ 72 dpi
  canvasHeight: 838, // 11.64 inch @ 72 dpi
  productHeaderFont: 'bold 18px helvetica',
  claimDataFont: '8px helvetica',
  productHeaderText: 'Attested data:',
  productHeaderOffsetX: 125,
  productHeaderOffsetY: 75,
  claimDataOffsetX: 25,
  claimDataOffsetY: 200,
  claimDataLineSpacing: 10,
  qrOffsetXright: 550,
  qrOffsetYbottom: 700,
  qrSizeMin: 150,
  footerFont: '10px helvetica',
  footerText: 'Dit is een automatisch gegenereerd document en daarom niet ondertekend. De gegevens zijn verkregen via NLX en geborgd in de QR-code. U kunt de echtheid van dit document controleren via een bijbehorende app of online',
  footerWidth: 400,
  footerHeight: 200,
  footerOffsetX: 90,
  footerOffsetY: 730
}

class PaperWallet {
  constructor (core = new DisciplCore()) {
    this.core = core
  }

  /**
   * retrieve the loaded discipl core api object used by this module
   */
  getCore () {
    return this.core
  }

  /**
   * issues an attested (signed) claim, exporting it to a verifiable data structure holding data and a QR code image
   * which can be used with other methods to save it as an image or PDF
   */
  async issue (claimLink, ssid, metadata = {}) {
    let claimData = await this.core.exportLD(claimLink, ssid)
    let data = stringify({ 'claimData': claimData, 'metadata': metadata })
    let qr = await QRCode.toDataURL(data)
    let ver = (await QRCode.create(data)).version
    return {
      claimData: claimData,
      qr: qr,
      version: ver
    }
  }

  /**
   * issues an attested (signed) claim, exporting it to a verifiable data structure holding data and a QR code image
   * this QR code can be exported to a wallet
   * @param {any} claimData The data shown on the canvas
   * @param {string} walletLink
   */
  async walletIssue (claimData, walletLink) {
    const data = await this.core.get(walletLink)
    let qr = await QRCode.toDataURL(stringify(data))
    let ver = (await QRCode.create(stringify(data))).version
    return {
      claimData: claimData,
      qr: qr,
      version: ver
    }
  }

  /**
   * draws the document on a canvas
   */
  async toCanvas (vc, template, canvas) {
    let attestordid = Object.keys(vc.claimData)[0]
    let claimlink = Object.keys(vc.claimData[attestordid][0])[0]
    let claimData = vc.claimData[attestordid][0][claimlink]

    let ctx = canvas.getContext('2d')
    ctx.drawImage(await loadImage(template.backgroundImage), 0, 0, canvas.width, canvas.height)
    ctx.drawImage(await loadImage(template.logoImage), 0, 0, template.logoWidth, template.logoHeight)
    ctx.drawImage(await loadImage(template.disciplImage), template.disciplOffsetX, template.disciplOffsetY, template.disciplWidth, template.disciplHeight)
    ctx.font = template.productHeaderFont
    ctx.fillText(template.productHeaderText + ':', template.productHeaderOffsetX, template.productHeaderOffsetY)

    // draw subheader
    ctx.font = template.subheaderFont
    ctx.fillText(template.subheaderText, template.subheaderOffsetX, template.subheaderOffsetY)

    // draw a line
    ctx.beginPath()
    ctx.moveTo(40, 250)
    ctx.lineTo(570, 250)
    ctx.stroke()

    ctx.font = template.claimDataFont
    let line = 0
    for (var i in claimData) {
      line++
      let key = Object.keys(claimData[i])[0]
      if (line > 59) {
        ctx.fillText(' ... ', template.claimDataOffsetX, template.claimDataOffsetY + (line * template.claimDataLineSpacing))
        break
      } else {
        ctx.fillText(key + ': ' + claimData[i][key], template.claimDataOffsetX, template.claimDataOffsetY + (line * template.claimDataLineSpacing))
      }
    }
    let qrImage = await loadImage(vc.qr)
    // Heuristic algorithm to estimate compact QRcode size
    let QRSize = Math.max((42 + (8 * vc.version)) * 595 / (21 * 25), template.qrSizeMin)
    ctx.drawImage(qrImage, template.qrOffsetXright - QRSize, template.qrOffsetYbottom - QRSize, QRSize, QRSize)
    // draw footer
    CanvasTextWrapper(canvas, template.footerText, {
      font: template.footerFont,
      paddingX: template.footerOffsetX,
      paddingY: template.footerOffsetY,
      textAlign: 'center',
      renderHDPI: false
    })
  }

  /**
   * attempts to read a QR from a canvas
   */
  fromCanvas (canvas) {
    var ctx = canvas.getContext('2d')
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    var decoded = jsQR(imageData.data, imageData.width, imageData.height)
    if (decoded) {
      return decoded
    }
    return null
  }

  /**
   * validates decoded QR data through a claim import,
   * verifying the imported claim is attested by the given did
   */
  async validate (did, decodedQR, validatorDid = null) {
    let result = null
    try {
      let claimData = JSON.parse(decodedQR).claimData
      if (claimData[did]) {
        result = await this.core.importLD(claimData, validatorDid)
      }
    } catch (err) {
      return null
    }
    return result
  }
}

export {
  PaperWallet,
  template
}
