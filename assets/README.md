Place your app logo image in this folder as `logo_luca.png` (square is recommended).

Then run the following to generate launcher icons for Android:

    npm install
    npm run generate:icons

The script will output the resized icons to `android/app/src/main/res/mipmap-*/ic_launcher.png` and `ic_launcher_round.png`.

If you need to customize sizes or destinations, edit `scripts/generate-icons.js` accordingly.
