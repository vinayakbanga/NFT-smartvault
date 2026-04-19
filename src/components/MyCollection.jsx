import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  getStampNFTContract,
  getStampNFTContractWithSigner,
  getMarketplaceContract,
  getMarketplaceContractWithSigner,
  MARKETPLACE_ADDRESS,
} from "../utils/contracts";

export default function MyCollection({ account, refreshKey, onRefresh }) {
  const [stamps, setStamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [listModal, setListModal] = useState(null); // { tokenId, name }
  const [listPrice, setListPrice] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (account) fetchCollection();
  }, [account, refreshKey]);

  const fetchCollection = async () => {
    setLoading(true);
    try {
      const stampNFT = await getStampNFTContract();
      const marketplace = await getMarketplaceContract();

      const tokenIds = await stampNFT.getCollectionByOwner(account);
      const items = [];

      for (const tokenId of tokenIds) {
        const metadata = await stampNFT.getStampMetadata(tokenId);
        const listing = await marketplace.getListing(tokenId);

        items.push({
          tokenId: tokenId.toString(),
          name: metadata.name,
          description: metadata.description,
          imageURI: metadata.imageURI,
          rarity: metadata.rarity,
          origin: metadata.origin,
          isListed: listing.active,
          listPrice: listing.active ? ethers.formatEther(listing.price) : null,
        });
      }

      setStamps(items);
    } catch (err) {
      console.error("Failed to fetch collection:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndList = async () => {
    if (!listModal || !listPrice) return;
    setActionLoading(listModal.tokenId);
    setStatus(null);

    try {
      const stampNFT = await getStampNFTContractWithSigner();
      const marketplace = await getMarketplaceContractWithSigner();

      // Check if already approved
      const approved = await stampNFT.getApproved(listModal.tokenId);
      const isApprovedForAll = await stampNFT.isApprovedForAll(account, MARKETPLACE_ADDRESS);

      if (approved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase() && !isApprovedForAll) {
        setStatus({ type: "loading", message: "⏳ Approving marketplace..." });
        const approveTx = await stampNFT.approve(MARKETPLACE_ADDRESS, listModal.tokenId);
        await approveTx.wait();
      }

      setStatus({ type: "loading", message: "⏳ Listing stamp..." });
      const priceWei = ethers.parseEther(listPrice);
      const listTx = await marketplace.listStamp(listModal.tokenId, priceWei);
      await listTx.wait();

      setStatus({ type: "success", message: `✅ Stamp #${listModal.tokenId} listed for ${listPrice} ETH!` });
      setListModal(null);
      setListPrice("");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message: `❌ ${err.reason || err.message || "Listing failed"}`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelListing = async (tokenId) => {
    setActionLoading(tokenId);
    setStatus(null);

    try {
      const marketplace = await getMarketplaceContractWithSigner();
      const tx = await marketplace.cancelListing(tokenId);

      setStatus({ type: "loading", message: "⏳ Cancelling listing..." });
      await tx.wait();

      setStatus({ type: "success", message: `✅ Listing for stamp #${tokenId} cancelled!` });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message: `❌ ${err.reason || err.message || "Cancel failed"}`,
      });
    } finally {
      setActionLoading(null);
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

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">📁 My Collection</h1>
        <p className="page-subtitle">View and manage your digital stamp NFTs</p>
      </div>

      {status && (
        <div className={`status-message status-${status.type}`}>
          {status.type === "loading" && <div className="spinner"></div>}
          {status.message}
        </div>
      )}

      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-value">{stamps.length}</div>
          <div className="stat-label">Total Stamps</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stamps.filter((s) => s.isListed).length}</div>
          <div className="stat-label">Listed</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {stamps.filter((s) => s.rarity === "Legendary").length}
          </div>
          <div className="stat-label">Legendary</div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ margin: "0 auto", width: 40, height: 40 }}></div>
          <p className="empty-state-text" style={{ marginTop: 16 }}>Loading collection...</p>
        </div>
      ) : stamps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-text">No stamps in your collection</p>
          <p className="empty-state-sub">Mint a new stamp or buy one from the marketplace!</p>
        </div>
      ) : (
        <div className="stamp-grid">
          {stamps.map((stamp) => (
            <div className="card" key={stamp.tokenId}>
              <div className="card-image">
                {stamp.imageURI && (stamp.imageURI.startsWith("http") || stamp.imageURI.startsWith("ipfs")) ? (
                  <img
                    src={stamp.imageURI.replace("ipfs://", "https://ipfs.io/ipfs/")}
                    alt={stamp.name}
                    onError={(e) => { e.target.style.display = "none"; e.target.parentNode.textContent = getStampEmoji(stamp.rarity); }}
                  />
                ) : (
                  getStampEmoji(stamp.rarity)
                )}
              </div>
              <div className="card-body">
                <div className="token-id">Token #{stamp.tokenId}</div>
                <div className="card-name">{stamp.name}</div>
                <div className="card-description">{stamp.description}</div>
                <div className="card-meta">
                  <span className={`badge ${getRarityClass(stamp.rarity)}`}>
                    {stamp.rarity}
                  </span>
                  <span className="badge badge-origin">{stamp.origin}</span>
                </div>

                {stamp.isListed ? (
                  <div className="card-price">
                    <div>
                      <div className="price-label">Listed at</div>
                      <div className="price-value">{stamp.listPrice} ETH</div>
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleCancelListing(stamp.tokenId)}
                      disabled={actionLoading === stamp.tokenId}
                    >
                      {actionLoading === stamp.tokenId ? (
                        <><div className="spinner"></div> Cancelling...</>
                      ) : (
                        "Cancel"
                      )}
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 16 }}>
                    <button
                      className="btn btn-primary btn-full"
                      onClick={() => setListModal({ tokenId: stamp.tokenId, name: stamp.name })}
                      disabled={actionLoading === stamp.tokenId}
                    >
                      📋 List for Sale
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── List Modal ──────────────────────────────────────── */}
      {listModal && (
        <div className="modal-overlay" onClick={() => setListModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              List "{listModal.name}" for Sale
            </h3>
            <div className="form-group">
              <label className="form-label" htmlFor="list-price">Price (ETH)</label>
              <input
                id="list-price"
                className="form-input"
                type="number"
                step="0.0001"
                min="0.0001"
                placeholder="0.01"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => { setListModal(null); setListPrice(""); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleApproveAndList}
                disabled={!listPrice || parseFloat(listPrice) <= 0 || actionLoading}
              >
                {actionLoading ? (
                  <><div className="spinner"></div> Processing...</>
                ) : (
                  "Approve & List"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
