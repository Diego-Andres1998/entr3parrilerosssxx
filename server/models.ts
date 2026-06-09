import { CustomerAnalysis } from "./db";

// ==========================================
// PANDAS-LIKE ADVANCED FILTRATION & AGGREGATION
// ==========================================

export interface AggregationResult {
  is_fuga: number;
  count: number;
  avg_spending: number;
  avg_visits: number;
}

export function performPandasAggregation(dataset: CustomerAnalysis[]): AggregationResult[] {
  // 1. Restrict to branch 'Osorno Centro'
  const filtered = dataset.filter(row => row.branch === "Osorno Centro");

  // 2. Group by 'is_fuga'
  const groups: Record<number, CustomerAnalysis[]> = { 0: [], 1: [] };
  filtered.forEach(row => {
    const key = row.is_fuga;
    if (groups[key] !== undefined) {
      groups[key].push(row);
    } else {
      groups[key] = [row];
    }
  });

  // 3. Compute arithmetic means (medias aritméticas)
  const results: AggregationResult[] = [];
  [0, 1].forEach(key => {
    const list = groups[key] || [];
    if (list.length === 0) {
      results.push({
        is_fuga: key,
        count: 0,
        avg_spending: 0,
        avg_visits: 0
      });
      return;
    }

    const totalSpending = list.reduce((sum, item) => sum + item.monthly_spending, 0);
    const totalVisits = list.reduce((sum, item) => sum + item.monthly_visits, 0);

    results.push({
      is_fuga: key,
      count: list.length,
      avg_spending: Math.round((totalSpending / list.length) * 100) / 100,
      avg_visits: Math.round((totalVisits / list.length) * 100) / 100
    });
  });

  return results;
}

// ==========================================
// KNN CLASSIFIER (K = 5 neighbors)
// ==========================================

export class KNNClassifier {
  k: number;
  trainX: number[][] = [];
  trainY: number[] = [];

  constructor(k = 5) {
    this.k = k;
  }

  fit(X: number[][], y: number[]) {
    this.trainX = X;
    this.trainY = y;
  }

  predict(X_test: number[][]): number[] {
    if (this.trainX.length === 0) {
      return X_test.map(() => 0);
    }

    // Normalization bounds to scale spending and visits to a 0-1 range fairly
    const spends = this.trainX.map(p => p[0]);
    const visits = this.trainX.map(p => p[1]);
    const minSpend = Math.min(...spends, 1);
    const maxSpend = Math.max(...spends, 100000);
    const minVisits = Math.min(...visits, 1);
    const maxVisits = Math.max(...visits, 10);

    const norm = (v: number, min: number, max: number) => {
      return max === min ? 0 : (v - min) / (max - min);
    };

    return X_test.map(point => {
      // Calculate distances to all training points
      const dists = this.trainX.map((trainPoint, idx) => {
        const dSpend = norm(point[0], minSpend, maxSpend) - norm(trainPoint[0], minSpend, maxSpend);
        const dVisits = norm(point[1], minVisits, maxVisits) - norm(trainPoint[1], minVisits, maxVisits);
        const distance = Math.sqrt(dSpend * dSpend + dVisits * dVisits);
        return { distance, label: this.trainY[idx] };
      });

      // Sort by proximity
      dists.sort((a, b) => a.distance - b.distance);

      // Take K neighbors (safely bounding if there aren't enough training points yet)
      const currentK = Math.min(this.k, dists.length);
      const neighbors = dists.slice(0, currentK);

      const votes = neighbors.reduce((acc, n) => {
        acc[n.label] = (acc[n.label] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      return (votes[1] || 0) >= (votes[0] || 0) ? 1 : 0;
    });
  }
}

// ==========================================
// DECISION TREE CLASSIFIER (Max Depth = 4)
// ==========================================

export interface DecisionNode {
  isLeaf: boolean;
  featureIndex?: number;  // 0 = spending, 1 = visits
  threshold?: number;
  left?: DecisionNode;
  right?: DecisionNode;
  label?: number;
}

export class DecisionTreeClassifier {
  maxDepth: number;
  root: DecisionNode | null = null;

  constructor(maxDepth = 4) {
    this.maxDepth = maxDepth;
  }

  private calculateGini(y: number[]): number {
    if (y.length === 0) return 0;
    const count1 = y.filter(val => val === 1).length;
    const p1 = count1 / y.length;
    const p0 = 1 - p1;
    return 1 - (p0 * p0 + p1 * p1);
  }

  private buildTree(X: number[][], y: number[], depth: number): DecisionNode {
    const isPure = y.every(val => val === y[0]);
    const count1 = y.filter(val => val === 1).length;
    const majorityClass = count1 >= (y.length / 2) ? 1 : 0;

    // Stop constraints
    if (depth >= this.maxDepth || isPure || X.length <= 2) {
      return { isLeaf: true, label: majorityClass };
    }

    let bestGiniValue = 999;
    let bFeature = -1;
    let bThreshold = -1;
    let bLeftX: number[][] = [];
    let bLeftY: number[] = [];
    let bRightX: number[][] = [];
    let bRightY: number[] = [];

    const numFeatures = X[0].length;

    for (let f = 0; f < numFeatures; f++) {
      const featureVals = X.map(r => r[f]);
      const uniqueVals = Array.from(new Set(featureVals)).sort((a, b) => a - b);

      for (let i = 0; i < uniqueVals.length - 1; i++) {
        // Splitting point as average of consecutive distinct values
        const thresh = (uniqueVals[i] + uniqueVals[i + 1]) / 2;

        const leftIndices: number[] = [];
        const rightIndices: number[] = [];

        X.forEach((row, idx) => {
          if (row[f] <= thresh) {
            leftIndices.push(idx);
          } else {
            rightIndices.push(idx);
          }
        });

        if (leftIndices.length === 0 || rightIndices.length === 0) continue;

        const leftY = leftIndices.map(idx => y[idx]);
        const rightY = rightIndices.map(idx => y[idx]);

        const splitGini = (leftY.length / y.length) * this.calculateGini(leftY) + 
                          (rightY.length / y.length) * this.calculateGini(rightY);

        if (splitGini < bestGiniValue) {
          bestGiniValue = splitGini;
          bFeature = f;
          bThreshold = thresh;
          bLeftX = leftIndices.map(idx => X[idx]);
          bLeftY = leftY;
          bRightX = rightIndices.map(idx => X[idx]);
          bRightY = rightY;
        }
      }
    }

    // Split didn't improve or split failed
    if (bFeature === -1) {
      return { isLeaf: true, label: majorityClass };
    }

    return {
      isLeaf: false,
      featureIndex: bFeature,
      threshold: bThreshold,
      left: this.buildTree(bLeftX, bLeftY, depth + 1),
      right: this.buildTree(bRightX, bRightY, depth + 1)
    };
  }

  fit(X: number[][], y: number[]) {
    if (X.length === 0) return;
    this.root = this.buildTree(X, y, 0);
  }

  private predictRow(node: DecisionNode, row: number[]): number {
    if (node.isLeaf) return node.label!;
    const val = row[node.featureIndex!];
    if (val <= node.threshold!) {
      return this.predictRow(node.left!, row);
    } else {
      return this.predictRow(node.right!, row);
    }
  }

  predict(X: number[][]): number[] {
    if (!this.root || X.length === 0) {
      return X.map(() => 0);
    }
    return X.map(row => this.predictRow(this.root!, row));
  }
}

// Helper to partition standard training and test subsets (80% train, 20% test split)
export function trainAndEvaluateModels(dataset: CustomerAnalysis[]): {
  dtAccuracy: number;
  knnAccuracy: number;
  totalRecords: number;
  trainSize: number;
  testSize: number;
} {
  // Translate dataset to raw ML format
  // y = is_fuga, X = [monthly_spending, monthly_visits]
  const X = dataset.map(row => [row.monthly_spending, row.monthly_visits]);
  const y = dataset.map(row => row.is_fuga);

  // Deterministic seed split for reliable output
  // Even elements to train, odd to test
  const trainIndices: number[] = [];
  const testIndices: number[] = [];

  X.forEach((_, idx) => {
    if (idx % 4 === 0) {
      testIndices.push(idx); // 25% test data
    } else {
      trainIndices.push(idx); // 75% train data
    }
  });

  // Guarantee we have at least some test samples
  if (testIndices.length === 0 && X.length > 0) {
    testIndices.push(0);
  }

  const trainX = trainIndices.map(i => X[i]);
  const trainY = trainIndices.map(i => y[i]);
  const testX = testIndices.map(i => X[i]);
  const testY = testIndices.map(i => y[i]);

  // Train Decision Tree (max_depth = 4)
  const dt = new DecisionTreeClassifier(4);
  dt.fit(trainX, trainY);
  const dtPreds = dt.predict(testX);
  
  let dtCorrect = 0;
  dtPreds.forEach((pred, idx) => {
    if (pred === testY[idx]) dtCorrect++;
  });
  const dtAccuracy = testY.length > 0 ? (dtCorrect / testY.length) : 1;

  // Train KNN (neighbors = 5)
  const knn = new KNNClassifier(5);
  knn.fit(trainX, trainY);
  const knnPreds = knn.predict(testX);

  let knnCorrect = 0;
  knnPreds.forEach((pred, idx) => {
    if (pred === testY[idx]) knnCorrect++;
  });
  const knnAccuracy = testY.length > 0 ? (knnCorrect / testY.length) : 1;

  return {
    dtAccuracy: Math.round(dtAccuracy * 1000) / 10,
    knnAccuracy: Math.round(knnAccuracy * 1000) / 10,
    totalRecords: dataset.length,
    trainSize: trainX.length,
    testSize: testX.length
  };
}
