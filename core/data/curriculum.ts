import { Concept, Dependency } from "../concept/schema";

export const CONCEPTS: Concept[] = [
  {
    id: "c_neural_network",
    name: "Neural Network",
    domain: "Machine Learning",
    level: "intro",
    definition: {
      canonical: "A computational model inspired by the structure of biological neural networks, consisting of layers of interconnected nodes (neurons) that process information.",
      variants: ["Universal function approximator", "Multi-layer Perceptron"]
    },
    claims: [
      { id: "cl_1", statement: "NNs can approximate any continuous function.", confidence: 0.99, source_refs: [] },
      { id: "cl_2", statement: "Deep networks generalize better than wide networks for image tasks.", confidence: 0.85, source_refs: [] }
    ],
    examples: [{ id: "ex_1", content: "Brain neurons firing", type: "analogy" }],
    non_examples: ["Linear Regression", "Decision Tree"],
    pedagogy: { best_first: "analogy", cognitive_load: 0.7, common_confusions: ["It's exactly like a brain", "More layers always means better"] }
  },
  {
    id: "c_gradient_descent",
    name: "Gradient Descent",
    domain: "Optimization",
    level: "intro",
    definition: {
      canonical: "An iterative optimization algorithm for finding a local minimum of a differentiable function.",
      variants: ["Hill climbing down a valley"]
    },
    claims: [
      { id: "cl_3", statement: "Requires the function to be differentiable.", confidence: 1.0, source_refs: [] }
    ],
    examples: [{ id: "ex_2", content: "Walking down a misty mountain", type: "analogy" }],
    non_examples: ["Random Search"],
    pedagogy: { best_first: "intuition", cognitive_load: 0.4, common_confusions: ["Global minimum guarantee"] }
  },
  {
    id: "c_backpropagation",
    name: "Backpropagation",
    domain: "Machine Learning",
    level: "intermediate",
    definition: {
      canonical: "An algorithm for computing the gradient of the loss function with respect to the weights of the network by applying the chain rule.",
      variants: ["Reverse-mode differentiation"]
    },
    claims: [],
    examples: [],
    non_examples: [],
    pedagogy: { best_first: "formal", cognitive_load: 0.9, common_confusions: ["It learns the weights directly"] }
  },
  {
    id: "c_loss_function",
    name: "Loss Function",
    domain: "Machine Learning",
    level: "intro",
    definition: {
      canonical: "A function that maps an event or values of one or more variables onto a real number intuitively representing some associated 'cost'.",
      variants: ["Objective function", "Cost function"]
    },
    claims: [],
    examples: [],
    non_examples: [],
    pedagogy: { best_first: "intuition", cognitive_load: 0.3, common_confusions: ["Accuracy vs Loss"] }
  },
  {
    id: "c_chain_rule",
    name: "Chain Rule",
    domain: "Calculus",
    level: "intro",
    definition: {
      canonical: "A formula to compute the derivative of a composite function.",
      variants: []
    },
    claims: [],
    examples: [],
    non_examples: [],
    pedagogy: { best_first: "formal", cognitive_load: 0.5, common_confusions: [] }
  }
];

export const DEPENDENCIES: Dependency[] = [
  { from: "c_gradient_descent", to: "c_loss_function", type: "requires", strength: 1.0 },
  { from: "c_neural_network", to: "c_gradient_descent", type: "uses", strength: 0.8 },
  { from: "c_backpropagation", to: "c_chain_rule", type: "requires", strength: 1.0 },
  { from: "c_backpropagation", to: "c_neural_network", type: "refines", strength: 1.0 }, // Actually it's a method for NN, but implies dependency
  { from: "c_neural_network", to: "c_loss_function", type: "requires", strength: 1.0 }
];
