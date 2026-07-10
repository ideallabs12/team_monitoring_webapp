const { Jimp } = require('jimp');

Jimp.read('public/allhands_logo_3.png')
  .then(image => {
    // autocrop removes borders of the same color as the top-left pixel
    image.autocrop();
    // resize it to 128x128 for a crisp favicon
    image.resize({ w: 128, h: 128 });
    image.write('public/favicon_cropped.png');
    console.log('Successfully cropped and saved favicon_cropped.png');
  })
  .catch(err => {
    console.error('Error cropping image:', err);
  });
