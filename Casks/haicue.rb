cask "haicue" do
  arch arm: "aarch64"

  version "0.114.129"
  sha256 arm: "7f1dcd38a23e4206572dbe87e61640954db0610bfe87b85b2cca8357fdff5f2e"

  url "https://downloads.haicue.com/public/releases/public/#{version}/macos/#{arch}/Haicue_#{version}_#{arch}.dmg"
  name "Haicue"
  desc "Threaded workspace for agent work"
  homepage "https://haicue.com/"

  auto_updates true
  depends_on arch: :arm64
  depends_on :macos
  app "Haicue.app"

  zap trash: [
    "~/.haicue",
    "~/Library/Application Support/com.devheart.haicue",
    "~/Library/Application Support/com.gy.claude-window",
    "~/Library/Caches/com.devheart.haicue",
    "~/Library/Caches/com.gy.claude-window",
    "~/Library/HTTPStorages/com.devheart.haicue",
    "~/Library/HTTPStorages/com.gy.claude-window",
    "~/Library/Preferences/com.devheart.haicue.plist",
    "~/Library/Preferences/com.gy.claude-window.plist",
    "~/Library/Saved Application State/com.devheart.haicue.savedState",
    "~/Library/Saved Application State/com.gy.claude-window.savedState",
    "~/Library/WebKit/com.devheart.haicue",
    "~/Library/WebKit/com.gy.claude-window",
  ]
end
