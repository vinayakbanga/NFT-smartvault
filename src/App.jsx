import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  connectWallet,
  getCurrentAccount,
  getStampNFTContract,
  getStampNFTContractWithSigner,
  getMarketplaceContract,
  getMarketplaceContractWithSigner,
  MARKETPLACE_ADDRESS,
} from "./utils/contracts";
import MintStamp from "./components/MintStamp";
import Marketplace from "./components/Marketplace";
import MyCollection from "./components/MyCollection";

function App() {
  const [account, setAccount] = useState(null);
  const [currentPage, setCurrentPage] = useState("marketplace");
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Connect wallet on load
  useEffect(() => {
    getCurrentAccount().then((acc) => {
      if (acc) setAccount(acc);
    });

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        setAccount(accounts.length > 0 ? accounts[0] : null);
      });
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  const handleConnect = async () => {
    try {
      const acc = await connectWallet();
      setAccount(acc);
    } catch (err) {
      alert(err.message);
    }
  };

  const shortAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <>
      {/* ─── Navigation ────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="navbar-logo">📮</span>
          <span className="navbar-title">StampVault</span>
        </div>

        <div className="navbar-nav">
          <button
            className={`nav-btn ${currentPage === "marketplace" ? "active" : ""}`}
            onClick={() => setCurrentPage("marketplace")}
          >
            🏪 Marketplace
          </button>
          <button
            className={`nav-btn ${currentPage === "collection" ? "active" : ""}`}
            onClick={() => setCurrentPage("collection")}
          >
            📁 My Collection
          </button>
          <button
            className={`nav-btn ${currentPage === "mint" ? "active" : ""}`}
            onClick={() => setCurrentPage("mint")}
          >
            ✨ Mint Stamp
          </button>
        </div>

        <button
          className={`connect-btn ${account ? "connected" : ""}`}
          onClick={handleConnect}
        >
          {account ? (
            <>
              <span className="wallet-dot"></span>
              {shortAddress(account)}
            </>
          ) : (
            "🦊 Connect Wallet"
          )}
        </button>
      </nav>

      {/* ─── Main Content ──────────────────────────────────── */}
      <main className="main-container">
        {!account ? (
          <div className="connect-prompt">
            <div className="connect-prompt-icon">🔗</div>
            <h2>Connect Your Wallet</h2>
            <p>Connect your MetaMask wallet to start collecting and trading digital stamps</p>
            <button className="btn btn-primary" onClick={handleConnect}>
              🦊 Connect MetaMask
            </button>
          </div>
        ) : (
          <>
            {currentPage === "marketplace" && (
              <Marketplace
                account={account}
                refreshKey={refreshKey}
                onRefresh={triggerRefresh}
              />
            )}
            {currentPage === "collection" && (
              <MyCollection
                account={account}
                refreshKey={refreshKey}
                onRefresh={triggerRefresh}
              />
            )}
            {currentPage === "mint" && (
              <MintStamp
                account={account}
                onMinted={triggerRefresh}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}

export default App;
