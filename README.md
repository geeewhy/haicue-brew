# Haicue Homebrew Tap

Install Haicue with Homebrew:

```sh
brew tap geeewhy/haicue-brew
brew install --cask haicue
```

This tap tracks the latest public macOS release. The cask uses a versioned DMG URL and pinned SHA so Homebrew installs remain reproducible while Haicue's in-app updater continues to handle app updates.

## Release Update

After publishing a Haicue release artifact to `downloads.haicue.com`, update the cask:

```sh
scripts/update-haicue-cask.sh \
  --version 0.49.1 \
  --sha256 acd200872aa9af9c88e8f63c628bc81e62b405a4ca98a63d8ede9a853c8f8c06
```

Then commit and push:

```sh
git add Casks/haicue.rb
git commit -m "haicue 0.49.1"
git push origin main
```
