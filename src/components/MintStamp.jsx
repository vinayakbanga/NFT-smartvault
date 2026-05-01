import { useState } from "react";
import { getStampNFTContractWithSigner } from "../utils/contracts";
import { uploadToIPFS, uploadMetadataToIPFS } from "../utils/ipfs";
import { generateStampImage, generateStampDescription, analyzeStampRarity } from "../utils/huggingface";

export default function MintStamp({ account, onMinted }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    rarity: "Common",
    origin: "",
    royaltyPercentage: "500",
  });
  const [imageFile, setImageFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState({ image: false, desc: false, rarity: false });
  const [aiPrompt, setAiPrompt] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt) return setStatus({ type: "error", message: "Please enter an image prompt." });
    setAiLoading(prev => ({ ...prev, image: true }));
    setStatus({ type: "loading", message: "🎨 AI is generating your stamp... (this may take 10-15s)" });
    try {
      const file = await generateStampImage(aiPrompt);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setStatus({ type: "success", message: "✅ AI Image generated successfully!" });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setAiLoading(prev => ({ ...prev, image: false }));
    }
  };

  const handleGenerateDesc = async () => {
    if (!form.name || !form.origin) return setStatus({ type: "error", message: "Please enter a Name and Origin first." });
    setAiLoading(prev => ({ ...prev, desc: true }));
    setStatus({ type: "loading", message: "✍️ AI Historian is researching..." });
    try {
      const desc = await generateStampDescription(form.name, form.origin);
      setForm(prev => ({ ...prev, description: desc }));
      setStatus({ type: "success", message: "✅ AI Description generated!" });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setAiLoading(prev => ({ ...prev, desc: false }));
    }
  };

  const handleAnalyzeRarity = async () => {
    if (!form.name || !form.origin) return setStatus({ type: "error", message: "Please enter a Name and Origin first." });
    setAiLoading(prev => ({ ...prev, rarity: true }));
    setStatus({ type: "loading", message: "🔍 AI is analyzing rarity..." });
    try {
      const rarity = await analyzeStampRarity(form.name, form.origin);
      setForm(prev => ({ ...prev, rarity }));
      setStatus({ type: "success", message: `✅ AI classified this stamp as: ${rarity}!` });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setAiLoading(prev => ({ ...prev, rarity: false }));
    }
  };

  const handleMint = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      if (!imageFile) {
        throw new Error("Please select an image file.");
      }

      // Step 1: Upload the image file to IPFS
      setStatus({ type: "loading", message: "⏳ Uploading image to IPFS via Pinata..." });
      const imageURI = await uploadToIPFS(imageFile);

      // Step 2: Upload ERC-721 metadata JSON to IPFS
      // MetaMask reads this JSON to show the NFT image & attributes
      setStatus({ type: "loading", message: "⏳ Uploading metadata to IPFS..." });
      const metadataURI = await uploadMetadataToIPFS({
        imageURI,
        name: form.name,
        description: form.description,
        rarity: form.rarity,
        origin: form.origin,
      });

      // Step 3: Mint — tokenURI points to metadata JSON, not the raw image
      setStatus({ type: "loading", message: "⏳ Please confirm transaction in MetaMask..." });
      const contract = await getStampNFTContractWithSigner();
      const tx = await contract.mintStamp(
        account,
        form.name,
        form.description,
        metadataURI,        // ← metadata JSON URI (ERC-721 standard)
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
        rarity: "Common",
        origin: "",
        royaltyPercentage: "500",
      });
      setImageFile(null);
      setImagePreview(null);
      const fileInput = document.getElementById("mint-image");
      if (fileInput) fileInput.value = "";

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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label className="form-label" htmlFor="mint-description" style={{ margin: 0 }}>Description</label>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: "4px 8px", fontSize: "12px" }} 
                onClick={handleGenerateDesc}
                disabled={aiLoading.desc}
              >
                {aiLoading.desc ? "✍️ Generating..." : "🪄 Auto-write"}
              </button>
            </div>
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
            <label className="form-label" htmlFor="mint-image">Stamp Image</label>
            
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input
                className="form-input"
                type="text"
                placeholder="AI Prompt: A vintage cat stamp..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleGenerateImage}
                disabled={aiLoading.image || !aiPrompt}
              >
                {aiLoading.image ? "🎨..." : "✨ Generate AI"}
              </button>
            </div>

            <input
              id="mint-image"
              className="form-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {imagePreview && (
              <div style={{ marginTop: "15px", textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: "var(--accent-primary-light)", marginBottom: "5px" }}>Image Preview:</p>
                <img 
                  src={imagePreview} 
                  alt="Stamp Preview" 
                  style={{ maxWidth: "200px", borderRadius: "8px", border: "2px solid var(--accent-primary)" }} 
                />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label className="form-label" htmlFor="mint-rarity" style={{ margin: 0 }}>Rarity</label>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: "4px 8px", fontSize: "12px" }} 
                  onClick={handleAnalyzeRarity}
                  disabled={aiLoading.rarity}
                >
                  {aiLoading.rarity ? "🔍..." : "🤖 Analyze"}
                </button>
              </div>
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
