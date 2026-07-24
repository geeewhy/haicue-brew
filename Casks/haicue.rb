cask "haicue" do
  arch arm: "aarch64"

  version "0.82.73"
  sha256 arm: "bd8ff2f110d067d3d6e681b37523197ea9b8ff8c2c50cb7519a0d11adf5f0ba6"

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
