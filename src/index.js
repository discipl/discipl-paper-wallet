
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import * as core from '@discipl/core'
import stringify from 'json-stable-stringify'
import { loadImage } from 'canvas'
var CanvasTextWrapper = require('canvas-text-wrapper').CanvasTextWrapper;

/**
 * a default template
 */
let template = {
  backgroundImage: 'images/template.png',
  logoImage: 'images/logo.png',
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
  qrOffsetX: 225,
  qrOffsetY: 200,
  qrWidth: 350,
  qrHeight: 350
}

/**
 * retrieve the loaded discipl core api object used by this module
 */
const getCore = () => {
  return core
}

/**
 * issues a attested (signed) claim, exporting it to a verifiable data structure holding data and a QR code image
 * which can be used with other methods to save it as an image or PDF
 */
const issue = async (claimLink, ssid) => {
  let claimData = await core.exportLD(claimLink, ssid)
  let data = stringify(claimData)
  let qr = await QRCode.toDataURL(data)
  return { claimData: claimData, qr: qr }
}

/**
 * draws the document on a canvas
 */
const toCanvas = async (vc, template, canvas) => {
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
  ctx.beginPath();
  ctx.moveTo(40, 250);
  ctx.lineTo(570, 250);
  ctx.stroke();

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
  ctx.drawImage(qrImage, template.qrOffsetX, template.qrOffsetY, template.qrWidth, template.qrHeight)

  // draw footer
  CanvasTextWrapper(canvas, template.footerText, {
        font: template.footerFont,
        paddingX: template.footerOffsetX,
        paddingY: template.footerOffsetY,
        textAlign: "center"
      });
}

/**
 * attempts to read a QR from a canvas
 */
const fromCanvas = (canvas) => {
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
const validate = async (did, decodedQR, validatorDid = null) => {
  let result = null
  try {
    let claimData = JSON.parse(decodedQR)
    if (claimData[did]) {
      result = await core.importLD(claimData, validatorDid)
    }
  } catch (err) {
    return null
  }
  return result
}

export {
  template,
  issue,
  toCanvas,
  fromCanvas,
  validate,
  getCore
}
