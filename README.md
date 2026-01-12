# IDChat

<p align="center">
  <img src="public/pwa-512x512-assets/icon.png" alt="IDChat Logo" width="120" height="120">
</p>

<p align="center">
  <strong>A decentralized, blockchain-based instant messaging application built on MetaID protocol</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#license">License</a>
</p>

---

## ✨ Features

- 🔐 **Decentralized Identity** - Built on MetaID protocol, your identity is truly yours
- 💬 **End-to-End Encryption** - Private messages are encrypted using ECIES
- 👥 **Group Chat** - Create and manage encrypted group conversations
- 🧧 **Crypto Red Packets** - Send BTC/MVC red packets to friends
- 📁 **Decentralized Storage** - Files stored on blockchain via MetaFile
- 🌐 **Multi-language Support** - i18n internationalization
- 📱 **PWA Support** - Install as a native app on any device
- 🔗 **Wallet Integration** - Connect with MetaletWallet and other Web3 wallets

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16
- Yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/metaid-developers/IDChat.git

# Navigate to project directory
cd IDChat

# Install dependencies
yarn install
```

### Development

```bash
# Start development server (testnet)
yarn gray

# Start development server (mainnet)
yarn mainnet
```

### Build

```bash
# Build for testnet
yarn build:gray

# Build for mainnet
yarn build:mainnet
```

## 🛠 Tech Stack

- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **UI Components**: Element Plus, Headless UI
- **Styling**: Tailwind CSS, SCSS
- **State Management**: Harlem
- **Blockchain**: MVC (MicrovisionChain), Bitcoin
- **Protocol**: MetaID

## 📁 Project Structure

```
src/
├── api/          # API service modules
├── components/   # Reusable Vue components
├── config/       # App configuration
├── hooks/        # Vue composables
├── languages/    # i18n translation files
├── layout/       # Layout components
├── lib/          # Third-party libraries
├── stores/       # State management
├── utils/        # Utility functions
├── views/        # Page components
└── wallet-adapters/  # Wallet integration adapters
```

## ⚙️ Configuration

API configuration is located in `public/app-config.json`:

```json
{
  "api": {
    "chatApi": "https://api.idchat.io",
    "chatWs": "wss://api.idchat.io",
    "fileApi": "https://file.metaid.io/metafile-indexer/api/v1/files"
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🔗 Links

- [MetaID Protocol](https://metaid.io)
- [MicrovisionChain](https://mvc.space)
- [MetaletWallet](https://metalet.space)
