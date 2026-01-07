
import { Genome } from './types';

export const FREE_TIER_LIMIT = 10;
export const PAID_TIER_DAILY_LIMIT = 3;
export const CHUNK_SIZE = 500;
export const CHUNK_OVERLAP = 50;

export const ECON_101_GENOME: Genome = {
  subject: "Econ 101",
  version: "1.0",
  nodes: [
    {
      gene_id: "ECON101_SCARCITY",
      gene_name: "Scarcity",
      difficulty: 1,
      content_alleles: [
        { type: "text", content: "Scarcity refers to the basic economic problem, the gap between limited – that is, scarce – resources and theoretically limitless wants. This situation requires people to make decisions about how to allocate resources in an efficient way, in order to satisfy as many of their wants as possible." },
        { type: "video", url: "https://www.youtube.com/embed/yoVc_S_gd_0" }
      ]
    },
    {
      gene_id: "ECON101_OPPCOST",
      gene_name: "Opportunity Cost",
      difficulty: 2,
      content_alleles: [
        { type: "text", content: "Opportunity cost is the potential forgone profit from a missed opportunity—the result of choosing one alternative and forgoing another. In short, it’s what you give up when you make a decision." },
        { type: "video", url: "https://www.youtube.com/embed/PSU-SA-Fv_M" }
      ]
    },
    {
      gene_id: "ECON101_SND",
      gene_name: "Supply and Demand",
      difficulty: 3,
      content_alleles: [
        { type: "text", content: "Supply and demand is a model of microeconomics. It describes how a price is formed in a market economy. In a competitive market, the unit price for a particular good will vary until it settles at a point where the quantity demanded by consumers equals quantity supplied." },
        { type: "video", url: "https://www.youtube.com/embed/9QSWLmyGpYc" }
      ]
    }
  ],
  edges: [
    { from: "ECON101_SCARCITY", to: "ECON101_OPPCOST" },
    { from: "ECON101_OPPCOST", to: "ECON101_SND" }
  ]
};
