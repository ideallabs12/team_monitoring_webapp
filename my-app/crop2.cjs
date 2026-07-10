const { Jimp } = require('jimp');

Jimp.read('public/allhands_logo_3.png')
  .then(image => {
    image.autocrop();
    image.write('public/allhands_logo_cropped.png');
    console.log('Successfully cropped and saved allhands_logo_cropped.png');
  })
  .catch(err => {
    console.error('Error cropping image:', err);
  });
