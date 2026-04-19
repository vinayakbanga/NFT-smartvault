// ─── Pinata IPFS Upload Utility ─────────────────────────────────────
// Get your free JWT from https://www.pinata.cloud/

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || "";
const PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

/**
 * Upload a file to IPFS via Pinata.
 * @param {File} file - The file to upload.
 * @returns {Promise<string>} - The IPFS URI (ipfs://CID).
 */
export async function uploadToIPFS(file) {
  if (!PINATA_JWT) {
    throw new Error("Pinata JWT not configured. Add VITE_PINATA_JWT to your .env file.");
  }

  const formData = new FormData();
  formData.append("file", file);

  // Optional metadata
  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append("pinataMetadata", metadata);

  const response = await fetch(PINATA_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`IPFS upload failed: ${error}`);
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
