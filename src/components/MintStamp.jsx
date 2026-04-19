import { useState } from "react";
import { getStampNFTContractWithSigner } from "../utils/contracts";

export default function MintStamp({ account, onMinted }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    imageURI: "",
    rarity: "Common",
    origin: "",
    royaltyPercentage: "500",
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleMint = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const contract = await getStampNFTContractWithSigner();
      const tx = await contract.mintStamp(
        account,
        form.name,
        form.description,
        form.imageURI,
        form.rarity,
        form.origin,
        parseInt(form.royaltyPercentage)
      );

      setStatus({ type: "loading", message: "⏳ Minting... waiting for confirmation" });
      const receipt = await tx.wait();

      // Get tokenId from event
      const mintEvent = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "StampMinted"
      );
      const tokenId = mintEvent ? mintEvent.args[0].toString() : "?";

      setStatus({
        type: "success",
        message: `✅ Stamp minted successfully! Token ID: #${tokenId}`,
      });

      // Reset form
      setForm({
        name: "",
        description: "",
        imageURI: "",
        rarity: "Common",
        origin: "",
        royaltyPercentage: "500",
      });

      if (onMinted) onMinted();
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message: `❌ ${err.reason || err.message || "Minting failed"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">✨ Mint a New Stamp</h1>
        <p className="page-subtitle">Create a unique digital stamp NFT with metadata and royalty settings</p>
      </div>

      {status && (
        <div className={`status-message status-${status.type}`}>
          {status.type === "loading" && <div className="spinner"></div>}
          {status.message}
        </div>
      )}

      <div className="form-container">
        <form onSubmit={handleMint}>
          <div className="form-group">
            <label className="form-label" htmlFor="mint-name">Stamp Name</label>
            <input
              id="mint-name"
              className="form-input"
              type="text"
              name="name"
              placeholder="e.g. Penny Black"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="mint-description">Description</label>
            <textarea
              id="mint-description"
              className="form-textarea"
              name="description"
              placeholder="Describe your stamp..."
              value={form.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="mint-image">Image URI</label>
            <input
              id="mint-image"
              className="form-input"
              type="text"
              name="imageURI"
              placeholder="ipfs://... or https://..."
              value={form.imageURI}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="mint-rarity">Rarity</label>
              <select
                id="mint-rarity"
                className="form-select"
                name="rarity"
                value={form.rarity}
                onChange={handleChange}
              >
                <option value="Common">Common</option>
                <option value="Rare">Rare</option>
                <option value="Legendary">Legendary</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mint-origin">Origin</label>
              <input
                id="mint-origin"
                className="form-input"
                type="text"
                name="origin"
                placeholder="e.g. India 1947"
                value={form.origin}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="mint-royalty">
              Royalty Percentage (basis points: 500 = 5%)
            </label>
            <input
              id="mint-royalty"
              className="form-input"
              type="number"
              name="royaltyPercentage"
              placeholder="500"
              min="0"
              max="10000"
              value={form.royaltyPercentage}
              onChange={handleChange}
              required
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Minting...
              </>
            ) : (
              "🖨️ Mint Stamp NFT"
            )}
          </button>
        </form>
      </div>
    </>
  );
}
