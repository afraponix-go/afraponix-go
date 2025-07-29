# Cordova iOS Setup Instructions

## Prerequisites
1. Install Xcode from the Mac App Store
2. Install Xcode Command Line Tools: `xcode-select --install`
3. Install Node.js and npm
4. Install Cordova CLI: `npm install -g cordova`

## Setup Steps

1. **Create Cordova Project**
   ```bash
   cordova create AquaAppIOS com.yourcompany.aquaapp AquaApp
   cd AquaAppIOS
   ```

2. **Add iOS Platform**
   ```bash
   cordova platform add ios
   ```

3. **Copy Web Files**
   Copy your HTML, CSS, and JS files to the `www` folder:
   ```bash
   cp ../index.html www/
   cp ../style.css www/
   cp ../script.js www/
   cp ../manifest.json www/
   ```

4. **Update Config.xml**
   Edit `config.xml` to configure your app:
   ```xml
   <widget id="com.yourcompany.aquaapp" version="1.0.0">
       <name>AquaApp</name>
       <description>Aquaponics System Monitor</description>
       <author email="you@domain.com" href="http://yourwebsite.com">
           Your Name
       </author>
   </widget>
   ```

5. **Build for iOS**
   ```bash
   cordova build ios
   ```

6. **Open in Xcode**
   ```bash
   cordova open ios
   ```

7. **Deploy to Device**
   - Connect your iPhone
   - Select your device in Xcode
   - Click the "Run" button

## Required for App Store
- Apple Developer Account ($99/year)
- App Store provisioning profiles
- App icons (see icon requirements below)