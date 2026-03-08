"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStablecoinConfigPda = getStablecoinConfigPda;
exports.getRolePda = getRolePda;
exports.getMinterQuotaPda = getMinterQuotaPda;
exports.getBlacklistPda = getBlacklistPda;
const gill_1 = require("gill");
const generated_1 = require("./generated");
async function getStablecoinConfigPda(mint, programId = generated_1.STC_PROGRAM_PROGRAM_ADDRESS) {
    const [pda] = await (0, gill_1.getProgramDerivedAddress)({
        programAddress: programId,
        seeds: ["stablecoin_config", (0, gill_1.getAddressEncoder)().encode(mint)],
    });
    return pda;
}
async function getRolePda(mint, assignee, roleType, programId = generated_1.STC_PROGRAM_PROGRAM_ADDRESS) {
    const [pda] = await (0, gill_1.getProgramDerivedAddress)({
        programAddress: programId,
        seeds: [
            "role",
            (0, gill_1.getAddressEncoder)().encode(mint),
            (0, gill_1.getAddressEncoder)().encode(assignee),
            new Uint8Array([roleType]),
        ],
    });
    return pda;
}
async function getMinterQuotaPda(mint, minter, programId = generated_1.STC_PROGRAM_PROGRAM_ADDRESS) {
    const [pda] = await (0, gill_1.getProgramDerivedAddress)({
        programAddress: programId,
        seeds: [
            "minter_quota",
            (0, gill_1.getAddressEncoder)().encode(mint),
            (0, gill_1.getAddressEncoder)().encode(minter),
        ],
    });
    return pda;
}
async function getBlacklistPda(mint, account, programId = "3nqtxhZZdpV5W2TPaa1hbWbeM3bhhsMg3Fy9oLdAHKfH") {
    const [pda] = await (0, gill_1.getProgramDerivedAddress)({
        programAddress: programId,
        seeds: [
            "blacklist",
            (0, gill_1.getAddressEncoder)().encode(mint),
            (0, gill_1.getAddressEncoder)().encode(account),
        ],
    });
    return pda;
}
