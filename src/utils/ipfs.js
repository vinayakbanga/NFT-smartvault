// ─── Pinata IPFS Upload Utility ─────────────────────────────────────
// Get your free JWT from https://www.pinata.cloud/

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || "";
const PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

/**
 * Upload a file (image) to IPFS via Pinata.
 * @param {File} file - The file to upload.
 * @returns {Promise<string>} - The IPFS URI (ipfs://CID).
 */
export async function uploadToIPFS(file) {
  if (!PINATA_JWT) {
    throw new Error("Pinata JWT not configured. Add VITE_PINATA_JWT to your .env file.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("pinataMetadata", JSON.stringify({ name: file.name }));

  const response = await fetch(PINATA_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`IPFS image upload failed: ${error}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Upload ERC-721 compliant metadata JSON to IPFS via Pinata.
 * MetaMask, OpenSea, and other viewers read this JSON to display
 * the NFT name, description, and image.
 *
 * @param {object} params
 * @param {string} params.imageURI   - The ipfs:// URI of the uploaded image.
 * @param {string} params.name       - Stamp name.
 * @param {string} params.description - Stamp description.
 * @param {string} params.rarity     - Rarity tier (Common / Rare / Legendary).
 * @param {string} params.origin     - Country / year of origin.
 * @returns {Promise<string>} - The IPFS URI of the metadata JSON (ipfs://CID).
 */
export async function uploadMetadataToIPFS({ imageURI, name, description, rarity, origin }) {
  if (!PINATA_JWT) {
    throw new Error("Pinata JWT not configured. Add VITE_PINATA_JWT to your .env file.");
  }

  // ERC-721 standard metadata schema
  const metadata = {
    name,
    description,
    image: imageURI,          // ipfs:// URI — wallets resolve this correctly
    attributes: [
      { trait_type: "Rarity", value: rarity },
      { trait_type: "Origin", value: origin },
    ],
  };

  const body = {
    pinataContent: metadata,
    pinataMetadata: { name: `${name}-metadata.json` },
  };

  const response = await fetch(PINATA_JSON_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`IPFS metadata upload failed: ${error}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Convert an IPFS URI to an HTTP gateway URL for display.
 * @param {string} uri - The IPFS URI (ipfs://CID).
 * @returns {string} - The HTTP gateway URL.
 */
export function ipfsToHttp(uri) {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace("ipfs://", "")}`;
  }
  return uri;
}

/**
 * Resolve an NFT's stored URI to a displayable image URL.
 *
 * Handles two cases:
 *  1. NEW mints  — uri points to a metadata JSON  → fetches JSON, reads "image" field.
 *  2. OLD mints  — uri points directly to an image  → converts to HTTP gateway URL.
 *
 * @param {string} uri - The value stored on-chain as imageURI / tokenURI.
 * @returns {Promise<string>} - A resolved HTTP image URL, or "" on failure.
 */
export async function resolveNFTImage(uri) {
  if (!uri) return "";

  const httpUrl = ipfsToHttp(uri);

  try {
    // Try fetching as JSON (new-style metadata URI)
    const res = await fetch(httpUrl);
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json") || contentType.includes("text/plain")) {
      const json = await res.json();
      if (json.image) {
        return ipfsToHttp(json.image); // resolve the image field inside the JSON
      }
    }

    // Content-type is an image, or JSON had no image field — use URL directly
    return httpUrl;
  } catch {
    // Network failure or parse error — try as direct image URL
    return httpUrl;
  }
}
