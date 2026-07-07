cask "haicue" do
  arch arm: "aarch64"

  version "0.49.1"
  sha256 arm: "acd200872aa9af9c88e8f63c628bc81e62b405a4ca98a63d8ede9a853c8f8c06"

  url "https://downloads.haicue.com/public/releases/public/#{version}/macos/#{arch}/Haicue_#{version}_#{arch}.dmg"
  name "Haicue"
  desc "Threaded workspace for agent work"
  homepage "https://haicue.com/"

  auto_updates true
  depends_on arch: :arm64

  app "Haicue.app"

  zap trash: [
    "~/Library/Application Support/com.gy.claude-window",
    "~/Library/Caches/com.gy.claude-window",
    "~/Library/HTTPStorages/com.gy.claude-window",
    "~/Library/Preferences/com.gy.claude-window.plist",
    "~/Library/Saved Application State/com.gy.claude-window.savedState",
    "~/.haicue",
  ]
end
