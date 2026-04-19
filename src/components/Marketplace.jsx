import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  getStampNFTContract,
  getMarketplaceContract,
  getMarketplaceContractWithSigner,
} from "../utils/contracts";

export default function Marketplace({ account, refreshKey, onRefresh }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [status, setStatus] = useState(null);

  // Fetch active listings
  useEffect(() => {
    fetchListings();
  }, [refreshKey]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const marketplace = await getMarketplaceContract();
      const stampNFT = await getStampNFTContract();

      const activeIds = await marketplace.getActiveListings();
      const items = [];

      for (const tokenId of activeIds) {
        const listing = await marketplace.getListing(tokenId);
        const metadata = await stampNFT.getStampMetadata(tokenId);
        const owner = await stampNFT.ownerOf(tokenId);

        items.push({
          tokenId: tokenId.toString(),
          seller: listing.seller,
          price: listing.price,
          priceEth: ethers.formatEther(listing.price),
          name: metadata.name,
          description: metadata.description,
          imageURI: metadata.imageURI,
          rarity: metadata.rarity,
          origin: metadata.origin,
          owner,
        });
      }

      setListings(items);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (tokenId, price) => {
    setBuyingId(tokenId);
    setStatus(null);

    try {
      const marketplace = await getMarketplaceContractWithSigner();
      const tx = await marketplace.buyStamp(tokenId, { value: price });

      setStatus({ type: "loading", message: "⏳ Processing purchase..." });
      await tx.wait();

      setStatus({ type: "success", message: `✅ Successfully purchased stamp #${tokenId}!` });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message: `❌ ${err.reason || err.message || "Purchase failed"}`,
      });
    } finally {
      setBuyingId(null);
    }
  };

  const getRarityClass = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case "legendary": return "badge-legendary";
      case "rare": return "badge-rare";
      default: return "badge-common";
    }
  };

  const getStampEmoji = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case "legendary": return "👑";
      case "rare": return "💎";
      default: return "📬";
    }
  };

  const shortAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🏪 Marketplace</h1>
        <p className="page-subtitle">Browse and buy unique digital stamp NFTs</p>
      </div>

      {status && (
        <div className={`status-message status-${status.type}`}>
          {status.type === "loading" && <div className="spinner"></div>}
          {status.message}
        </div>
      )}

      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-value">{listings.length}</div>
          <div className="stat-label">Active Listings</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {listings.length > 0
              ? `${Math.min(...listings.map((l) => parseFloat(l.priceEth))).toFixed(4)}`
              : "—"}
          </div>
          <div className="stat-label">Floor Price (ETH)</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {listings.filter((l) => l.rarity === "Legendary").length}
          </div>
          <div className="stat-label">Legendary Stamps</div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ margin: "0 auto", width: 40, height: 40 }}></div>
          <p className="empty-state-text" style={{ marginTop: 16 }}>Loading listings...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏪</div>
          <p className="empty-state-text">No stamps listed yet</p>
          <p className="empty-state-sub">Be the first to list a stamp for sale!</p>
        </div>
      ) : (
        <div className="stamp-grid">
          {listings.map((item) => (
            <div className="card" key={item.tokenId}>
              <div className="card-image">
                {item.imageURI && (item.imageURI.startsWith("http") || item.imageURI.startsWith("ipfs")) ? (
                  <img
                    src={item.imageURI.replace("ipfs://", "https://ipfs.io/ipfs/")}
                    alt={item.name}
                    onError={(e) => { e.target.style.display = "none"; e.target.parentNode.textContent = getStampEmoji(item.rarity); }}
                  />
                ) : (
                  getStampEmoji(item.rarity)
                )}
              </div>
              <div className="card-body">
                <div className="token-id">Token #{item.tokenId}</div>
                <div className="card-name">{item.name}</div>
                <div className="card-description">{item.description}</div>
                <div className="card-meta">
                  <span className={`badge ${getRarityClass(item.rarity)}`}>
                    {item.rarity}
                  </span>
                  <span className="badge badge-origin">{item.origin}</span>
                </div>
                <div className="seller-info">
                  Seller: {shortAddress(item.seller)}
                </div>
                <div className="card-price">
                  <div>
                    <div className="price-label">Price</div>
                    <div className="price-value">{item.priceEth} ETH</div>
                  </div>
                  <button
                    className="btn btn-buy"
                    style={{ width: "auto", padding: "10px 24px" }}
                    onClick={() => handleBuy(item.tokenId, item.price)}
                    disabled={
                      buyingId === item.tokenId ||
                      item.seller.toLowerCase() === account?.toLowerCase()
                    }
                  >
                    {buyingId === item.tokenId ? (
                      <><div className="spinner"></div> Buying...</>
                    ) : item.seller.toLowerCase() === account?.toLowerCase() ? (
                      "Your Listing"
                    ) : (
                      "Buy Now"
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
