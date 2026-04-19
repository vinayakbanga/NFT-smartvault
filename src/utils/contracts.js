import { ethers } from "ethers";

// ─── Contract Addresses (UPDATE THESE after deploying to Sepolia) ────
// Replace with your actual deployed contract addresses
export const STAMP_NFT_ADDRESS = "0x230262c624594a8C7fB0254571A13d207f99583F";
export const MARKETPLACE_ADDRESS = "0xE5a2040a1328987a690167066Beb3bB72eFdB9b6";

// ─── ABIs ────────────────────────────────────────────────────────────
export const STAMP_NFT_ABI = [
  // Mint
  "function mintStamp(address to, string name, string description, string imageURI, string rarity, string origin, uint96 royaltyPercentage) external returns (uint256)",
  // Views
  "function getStampMetadata(uint256 tokenId) external view returns (tuple(string name, string description, string imageURI, string rarity, string origin))",
  "function getCollectionByOwner(address owner) external view returns (uint256[])",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address, uint256)",
  // Approvals
  "function approve(address to, uint256 tokenId) external",
  "function getApproved(uint256 tokenId) external view returns (address)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address owner, address operator) external view returns (bool)",
  // ERC-165
  "function supportsInterface(bytes4 interfaceId) external view returns (bool)",
  // Events
  "event StampMinted(uint256 indexed tokenId, address indexed creator, string name)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

export const MARKETPLACE_ABI = [
  // Actions
  "function listStamp(uint256 tokenId, uint256 price) external",
  "function buyStamp(uint256 tokenId) external payable",
  "function cancelListing(uint256 tokenId) external",
  // Views
  "function getListing(uint256 tokenId) external view returns (tuple(address seller, uint256 price, bool active))",
  "function getActiveListings() external view returns (uint256[])",
  "function stampNFT() external view returns (address)",
  // Events
  "event StampListed(uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event StampSold(uint256 indexed tokenId, address indexed buyer, uint256 price)",
  "event ListingCancelled(uint256 indexed tokenId, address indexed seller)",
];

// ─── Contract Instances ──────────────────────────────────────────────

/**
 * Get a read-only provider
 */
export function getProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

/**
 * Get a signer (connected wallet)
 */
export async function getSigner() {
  const provider = getProvider();
  return await provider.getSigner();
}

/**
 * Get StampNFT contract instance (read-only)
 */
export async function getStampNFTContract() {
  const provider = getProvider();
  return new ethers.Contract(STAMP_NFT_ADDRESS, STAMP_NFT_ABI, provider);
}

/**
 * Get StampNFT contract instance (with signer for writes)
 */
export async function getStampNFTContractWithSigner() {
  const signer = await getSigner();
  return new ethers.Contract(STAMP_NFT_ADDRESS, STAMP_NFT_ABI, signer);
}

/**
 * Get Marketplace contract instance (read-only)
 */
export async function getMarketplaceContract() {
  const provider = getProvider();
  return new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
}

/**
 * Get Marketplace contract instance (with signer for writes)
 */
export async function getMarketplaceContractWithSigner() {
  const signer = await getSigner();
  return new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
}

/**
 * Connect wallet via MetaMask
 */
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask!");
  }
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  return accounts[0];
}

/**
 * Get current connected account
 */
export async function getCurrentAccount() {
  if (!window.ethereum) return null;
  const accounts = await window.ethereum.request({
    method: "eth_accounts",
  });
  return accounts.length > 0 ? accounts[0] : null;
}
