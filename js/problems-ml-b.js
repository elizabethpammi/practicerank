// ML problem bank part B — Machine Learning fundamentals (6). Python under Pyodide.
// Same shape as problems-ml-a.js; pushes into window.ML_PROBLEMS.
(function () {
  "use strict";
  var M = (window.ML_PROBLEMS = window.ML_PROBLEMS || []);
  var problems = [
{
  "slug": "ml-linear-regression",
  "name": "Linear Regression from Scratch",
  "category": "Machine Learning",
  "difficulty": "Medium",
  "sub": "Regression",
  "maxScore": 35,
  "successRate": "62.47%",
  "lang": "python",
  "fn": "fit_and_evaluate",
  "statement": "\n<p><b>Why this matters:</b> linear regression is \"fit the best straight line\" — the hello-world of ML, and still what half of production models secretly are. Two ideas here: (1) you fit on <em>training</em> data and score on held-out <em>test</em> data, because scoring on data the model saw is cheating; (2) the best-fit line has a closed-form answer, no gradient descent needed.</p>\n<p>Write <code>fit_and_evaluate(X, y, test_ratio)</code>. <code>X</code> is a 2D list of features, <code>y</code> a list of targets. Split <strong>deterministically, no shuffling</strong>: the first <code>n_train = n - floor(n * test_ratio)</code> rows are train, the rest are test. Fit ordinary least squares <em>with an intercept</em> on the train rows (hint: append a column of 1s and use <code>np.linalg.lstsq</code>). Return:</p>\n<pre>{\"weights\": [w per feature], \"intercept\": b, \"test_mse\": mean squared error on test rows}</pre>\n<p>Round everything to 6 decimals. All expected outputs in the tests are rounded to 6 decimals.</p>\n<h3>Example</h3>\n<pre>fit_and_evaluate([[1], [2], [3], [4]], [3, 5, 7, 9], 0.25)\n-&gt;  {\"weights\": [2.0], \"intercept\": 1.0, \"test_mse\": 0.0}   # y = 2x + 1 exactly</pre>\n<h3>Goal</h3>\n<p>Understand the pieces: design matrix with bias column, <code>lstsq</code> for the fit, and MSE = mean of squared prediction errors on rows the fit never saw.</p>",
  "starter": "import numpy as np\n\ndef fit_and_evaluate(X, y, test_ratio):\n    # X: 2D list, y: list, test_ratio: float\n    # First n - floor(n*test_ratio) rows train, rest test (no shuffle).\n    # Fit OLS with intercept on train; return\n    # {\"weights\": [...], \"intercept\": float, \"test_mse\": float}, rounded to 6.\n    # Write your code here\n    pass\n",
  "solution": {
    "code": "import numpy as np\n\ndef fit_and_evaluate(X, y, test_ratio):\n    X = np.array(X, dtype=float)\n    y = np.array(y, dtype=float)\n    n = len(y)\n    n_test = int(np.floor(n * test_ratio))\n    n_train = n - n_test\n    Xtr, Xte = X[:n_train], X[n_train:]\n    ytr, yte = y[:n_train], y[n_train:]\n    # design matrix: features + a column of 1s so lstsq learns the intercept too\n    A = np.hstack([Xtr, np.ones((n_train, 1))])\n    coef, *_ = np.linalg.lstsq(A, ytr, rcond=None)\n    weights, intercept = coef[:-1], coef[-1]\n    if n_test > 0:\n        preds = Xte @ weights + intercept\n        mse = float(np.mean((preds - yte) ** 2))\n    else:\n        mse = 0.0\n    return {\n        \"weights\": [round(float(w), 6) for w in weights],\n        \"intercept\": round(float(intercept), 6),\n        \"test_mse\": round(mse, 6),\n    }\n",
    "explanation": "<p>Appending a 1s column turns \"line with intercept\" into pure matrix algebra: solve <code>A·coef ≈ y</code> by least squares. The train/test split is the conceptual heart — MSE on unseen rows estimates how the model will do on future data, which is the only score that matters.</p>"
  },
  "cases": [
    {
      "args": [
        [
          [
            1
          ],
          [
            2
          ],
          [
            3
          ],
          [
            4
          ]
        ],
        [
          3,
          5,
          7,
          9
        ],
        0.25
      ],
      "expected": {
        "weights": [
          2.0
        ],
        "intercept": 1.0,
        "test_mse": 0.0
      },
      "sample": true
    },
    {
      "args": [
        [
          [
            0
          ],
          [
            1
          ],
          [
            2
          ],
          [
            3
          ],
          [
            4
          ],
          [
            5
          ]
        ],
        [
          1,
          3,
          5,
          7,
          9,
          11
        ],
        0.5
      ],
      "expected": {
        "weights": [
          2.0
        ],
        "intercept": 1.0,
        "test_mse": 0.0
      },
      "sample": true
    },
    {
      "args": [
        [
          [
            1,
            0
          ],
          [
            0,
            1
          ],
          [
            1,
            1
          ],
          [
            2,
            1
          ],
          [
            1,
            2
          ],
          [
            2,
            2
          ]
        ],
        [
          3,
          4,
          6,
          8,
          9,
          11
        ],
        0.34
      ],
      "expected": {
        "weights": [
          2.0,
          3.0
        ],
        "intercept": 1.0,
        "test_mse": 0.0
      },
      "sample": false
    },
    {
      "args": [
        [
          [
            1
          ],
          [
            2
          ],
          [
            3
          ],
          [
            4
          ],
          [
            5
          ]
        ],
        [
          2.1,
          3.9,
          6.2,
          7.8,
          10.1
        ],
        0.2
      ],
      "expected": {
        "weights": [
          1.94
        ],
        "intercept": 0.15,
        "test_mse": 0.0625
      },
      "sample": false
    },
    {
      "args": [
        [
          [
            10
          ],
          [
            20
          ],
          [
            30
          ]
        ],
        [
          5,
          5,
          5
        ],
        0.34
      ],
      "expected": {
        "weights": [
          0.0
        ],
        "intercept": 5.0,
        "test_mse": 0.0
      },
      "sample": false
    }
  ]
},
{
  "slug": "ml-logistic-step",
  "name": "One Logistic Gradient Step",
  "category": "Machine Learning",
  "difficulty": "Medium",
  "sub": "Gradient Descent",
  "maxScore": 35,
  "successRate": "58.93%",
  "lang": "python",
  "fn": "logistic_step",
  "statement": "\n<p><b>Why this matters:</b> almost all of deep learning is this loop: predict → measure error → nudge weights downhill → repeat. Logistic regression is the smallest real example. The model predicts a probability with the <em>sigmoid</em> <code>σ(z) = 1/(1+e^-z)</code>, and the gradient of its loss has a famously clean form: <code>Xᵀ(predictions - labels) / n</code>.</p>\n<p>Write <code>logistic_step(X, y, weights, lr)</code> performing exactly <strong>one</strong> gradient-descent update:</p>\n<pre>z = X @ weights\np = sigmoid(z)\ngradient = X.T @ (p - y) / n\nnew_weights = weights - lr * gradient</pre>\n<p><code>X</code> is a 2D list (include a bias column of 1s yourself in the data if you want an intercept — the tests do), <code>y</code> is 0/1 labels, <code>weights</code> has one entry per column of X. Return the new weights as a list rounded to 6 decimals. All expected outputs in the tests are rounded to 6 decimals.</p>\n<h3>Example</h3>\n<pre>logistic_step([[1, 0], [1, 1]], [0, 1], [0.0, 0.0], 0.1)\n-&gt;  [0.0, 0.025]</pre>\n<h3>Goal</h3>\n<p>Pure NumPy, no loops. If you can write this, you understand what <code>optimizer.step()</code> in PyTorch is doing for millions of weights instead of two.</p>",
  "starter": "import numpy as np\n\ndef logistic_step(X, y, weights, lr):\n    # X: 2D list (n rows), y: list of 0/1, weights: list, lr: float\n    # Do ONE gradient descent step for logistic regression.\n    # Return new weights as a list rounded to 6 decimals.\n    # Write your code here\n    pass\n",
  "solution": {
    "code": "import numpy as np\n\ndef logistic_step(X, y, weights, lr):\n    X = np.array(X, dtype=float)\n    y = np.array(y, dtype=float)\n    w = np.array(weights, dtype=float)\n    p = 1.0 / (1.0 + np.exp(-(X @ w)))     # sigmoid: squash scores to (0,1)\n    grad = X.T @ (p - y) / len(y)          # gradient of mean log-loss\n    w = w - lr * grad                      # step downhill\n    return [round(float(v), 6) for v in w]\n",
    "explanation": "<p>The gradient <code>Xᵀ(p−y)/n</code> reads as: for each weight, how much did its feature contribute to the errors, on average. Subtracting <code>lr</code> times that moves predictions toward the labels. Every neural network training step is this pattern with a longer chain rule.</p>"
  },
  "cases": [
    {
      "args": [
        [
          [
            1,
            0
          ],
          [
            1,
            1
          ]
        ],
        [
          0,
          1
        ],
        [
          0.0,
          0.0
        ],
        0.1
      ],
      "expected": [
        0.0,
        0.025
      ],
      "sample": true
    },
    {
      "args": [
        [
          [
            1,
            2
          ],
          [
            1,
            3
          ],
          [
            1,
            4
          ],
          [
            1,
            5
          ]
        ],
        [
          0,
          0,
          1,
          1
        ],
        [
          0.0,
          0.0
        ],
        0.5
      ],
      "expected": [
        0.0,
        0.25
      ],
      "sample": true
    },
    {
      "args": [
        [
          [
            1,
            -1
          ],
          [
            1,
            1
          ]
        ],
        [
          0,
          1
        ],
        [
          0.5,
          -0.5
        ],
        1.0
      ],
      "expected": [
        0.384471,
        0.115529
      ],
      "sample": false
    },
    {
      "args": [
        [
          [
            1,
            0.5,
            2
          ],
          [
            1,
            1.5,
            1
          ],
          [
            1,
            2.5,
            0
          ]
        ],
        [
          1,
          0,
          0
        ],
        [
          0.1,
          0.2,
          0.3
        ],
        0.05
      ],
      "expected": [
        0.08327,
        0.158977,
        0.299198
      ],
      "sample": false
    },
    {
      "args": [
        [
          [
            1,
            10
          ]
        ],
        [
          1
        ],
        [
          0.0,
          0.0
        ],
        0.1
      ],
      "expected": [
        0.05,
        0.5
      ],
      "sample": false
    }
  ]
},
{
  "slug": "ml-kmeans-step",
  "name": "One K-Means Iteration",
  "category": "Machine Learning",
  "difficulty": "Medium",
  "sub": "Clustering",
  "maxScore": 35,
  "successRate": "60.18%",
  "lang": "python",
  "fn": "kmeans_step",
  "statement": "\n<p><b>Why this matters:</b> k-means is <em>unsupervised</em> learning — no labels, just \"find k natural groups in these points\". The algorithm is a two-beat dance repeated until nothing moves: <strong>assign</strong> each point to its nearest centroid, then <strong>update</strong> each centroid to the mean of its assigned points. You implement one full beat.</p>\n<p>Write <code>kmeans_step(points, centroids)</code> (both 2D lists). For each point find the nearest centroid by Euclidean distance (ties → the lowest centroid index). Then recompute each centroid as the mean of its assigned points; a centroid with <strong>no assigned points stays where it is</strong>. Return:</p>\n<pre>{\"labels\": [nearest centroid index per point], \"centroids\": updated 2D list}</pre>\n<p>Round centroid coordinates to 6 decimals. All expected outputs in the tests are rounded to 6 decimals.</p>\n<h3>Example</h3>\n<pre>kmeans_step([[0, 0], [1, 0], [10, 10]], [[0, 0], [10, 10]])\n-&gt;  {\"labels\": [0, 0, 1], \"centroids\": [[0.5, 0.0], [10.0, 10.0]]}</pre>\n<h3>Goal</h3>\n<p>Reuse the pairwise-distance broadcasting pattern for the assign step (<code>argmin</code> over the centroid axis), then a small loop over k for the update — k is tiny, points are many, so loop over the small thing.</p>",
  "starter": "import numpy as np\n\ndef kmeans_step(points, centroids):\n    # points: 2D list (n x d), centroids: 2D list (k x d)\n    # One k-means iteration: assign to nearest centroid (ties -> lowest\n    # index), recompute centroids as means (empty cluster keeps old spot).\n    # Return {\"labels\": [...], \"centroids\": [[...]]}, coords rounded to 6.\n    # Write your code here\n    pass\n",
  "solution": {
    "code": "import numpy as np\n\ndef kmeans_step(points, centroids):\n    pts = np.array(points, dtype=float)\n    cts = np.array(centroids, dtype=float)\n    # assign: (n,1,d)-(1,k,d) -> (n,k) distances; argmin takes lowest index on ties\n    d = np.sqrt(((pts[:, None, :] - cts[None, :, :]) ** 2).sum(axis=-1))\n    labels = d.argmin(axis=1)\n    # update: mean of assigned points; empty cluster keeps its old position\n    new_cts = cts.copy()\n    for k in range(len(cts)):\n        mask = labels == k\n        if mask.any():\n            new_cts[k] = pts[mask].mean(axis=0)\n    return {\n        \"labels\": [int(l) for l in labels],\n        \"centroids\": np.round(new_cts, 6).tolist(),\n    }\n",
    "explanation": "<p>Assign is vectorized with the same <code>[:, None, :]</code> broadcasting as pairwise distances; <code>argmin</code>'s first-match behavior gives the tie rule for free. The empty-cluster guard matters: real k-means implementations either keep or re-seed dead centroids, and forgetting it produces NaN centroids.</p>"
  },
  "cases": [
    {
      "args": [
        [
          [
            0,
            0
          ],
          [
            1,
            0
          ],
          [
            10,
            10
          ]
        ],
        [
          [
            0,
            0
          ],
          [
            10,
            10
          ]
        ]
      ],
      "expected": {
        "labels": [
          0,
          0,
          1
        ],
        "centroids": [
          [
            0.5,
            0.0
          ],
          [
            10.0,
            10.0
          ]
        ]
      },
      "sample": true
    },
    {
      "args": [
        [
          [
            1,
            1
          ],
          [
            2,
            2
          ],
          [
            8,
            8
          ],
          [
            9,
            9
          ]
        ],
        [
          [
            0,
            0
          ],
          [
            10,
            10
          ]
        ]
      ],
      "expected": {
        "labels": [
          0,
          0,
          1,
          1
        ],
        "centroids": [
          [
            1.5,
            1.5
          ],
          [
            8.5,
            8.5
          ]
        ]
      },
      "sample": true
    },
    {
      "args": [
        [
          [
            5,
            5
          ]
        ],
        [
          [
            0,
            0
          ],
          [
            10,
            10
          ]
        ]
      ],
      "expected": {
        "labels": [
          0
        ],
        "centroids": [
          [
            5.0,
            5.0
          ],
          [
            10.0,
            10.0
          ]
        ]
      },
      "sample": false
    },
    {
      "args": [
        [
          [
            1,
            0
          ],
          [
            -1,
            0
          ]
        ],
        [
          [
            0,
            1
          ],
          [
            0,
            -1
          ]
        ]
      ],
      "expected": {
        "labels": [
          0,
          0
        ],
        "centroids": [
          [
            0.0,
            0.0
          ],
          [
            0.0,
            -1.0
          ]
        ]
      },
      "sample": false
    },
    {
      "args": [
        [
          [
            0,
            0
          ],
          [
            4,
            0
          ],
          [
            2,
            3
          ]
        ],
        [
          [
            0,
            0
          ],
          [
            4,
            0
          ],
          [
            2,
            3
          ]
        ]
      ],
      "expected": {
        "labels": [
          0,
          1,
          2
        ],
        "centroids": [
          [
            0.0,
            0.0
          ],
          [
            4.0,
            0.0
          ],
          [
            2.0,
            3.0
          ]
        ]
      },
      "sample": false
    },
    {
      "args": [
        [
          [
            1
          ],
          [
            2
          ],
          [
            3
          ],
          [
            10
          ],
          [
            11
          ],
          [
            12
          ]
        ],
        [
          [
            2
          ],
          [
            11
          ]
        ]
      ],
      "expected": {
        "labels": [
          0,
          0,
          0,
          1,
          1,
          1
        ],
        "centroids": [
          [
            2.0
          ],
          [
            11.0
          ]
        ]
      },
      "sample": false
    }
  ]
},
{
  "slug": "ml-decision-stump",
  "name": "Best Decision Stump",
  "category": "Machine Learning",
  "difficulty": "Hard",
  "sub": "Trees",
  "maxScore": 40,
  "successRate": "52.71%",
  "lang": "python",
  "fn": "best_stump",
  "statement": "\n<p><b>Why this matters:</b> a <em>decision stump</em> is a one-question decision tree: \"is feature ≤ t? predict this, else predict that.\" Stack hundreds of stumps and you get gradient-boosted trees (XGBoost), which still beat neural nets on most tabular data. Finding the best single split is the core operation inside every tree learner.</p>\n<p>Write <code>best_stump(values, labels)</code> where <code>values</code> is a list of numbers (one feature) and <code>labels</code> a list of 0/1. Candidate thresholds are the <strong>midpoints between consecutive distinct sorted values</strong>. For each threshold <code>t</code>: the left side is <code>values &lt;= t</code>, right side is <code>values &gt; t</code>; each side predicts its <strong>majority label (ties predict 0)</strong>. Pick the threshold with the highest accuracy over all points; break accuracy ties by the <strong>smallest threshold</strong>. You may assume at least 2 distinct values. Return:</p>\n<pre>{\"threshold\": t, \"left_label\": 0 or 1, \"right_label\": 0 or 1, \"accuracy\": fraction correct}</pre>\n<p>Round <code>threshold</code> and <code>accuracy</code> to 6 decimals. All expected outputs in the tests are rounded to 6 decimals.</p>\n<h3>Example</h3>\n<pre>best_stump([1, 2, 8, 9], [0, 0, 1, 1])\n-&gt;  {\"threshold\": 5.0, \"left_label\": 0, \"right_label\": 1, \"accuracy\": 1.0}</pre>\n<h3>Goal</h3>\n<p>A loop over candidate thresholds is fine (there are at most n-1). The learning is in defining the candidates, the majority rule, and the tie-breaks precisely — exactly the sort of spec discipline tree libraries live and die by.</p>",
  "starter": "import numpy as np\n\ndef best_stump(values, labels):\n    # values: list of numbers, labels: list of 0/1\n    # Try midpoints of consecutive distinct sorted values as thresholds.\n    # left = values <= t, right = values > t, each side predicts its\n    # majority label (tie -> 0). Best accuracy wins; ties -> smallest t.\n    # Return {\"threshold\", \"left_label\", \"right_label\", \"accuracy\"},\n    # threshold/accuracy rounded to 6 decimals.\n    # Write your code here\n    pass\n",
  "solution": {
    "code": "import numpy as np\n\ndef best_stump(values, labels):\n    v = np.array(values, dtype=float)\n    y = np.array(labels, dtype=int)\n    uniq = np.unique(v)                      # sorted distinct values\n    thresholds = (uniq[:-1] + uniq[1:]) / 2  # midpoints between neighbors\n\n    def majority(side):                      # majority label, tie -> 0\n        ones = int(side.sum())\n        zeros = len(side) - ones\n        return 1 if ones > zeros else 0\n\n    best = None\n    for t in thresholds:\n        left = y[v <= t]\n        right = y[v > t]\n        ll, rl = majority(left), majority(right)\n        correct = int((left == ll).sum() + (right == rl).sum())\n        acc = correct / len(y)\n        if best is None or acc > best[0] + 1e-12:   # strict improvement only,\n            best = (acc, t, ll, rl)                 # so ties keep smallest t\n    acc, t, ll, rl = best\n    return {\n        \"threshold\": round(float(t), 6),\n        \"left_label\": ll,\n        \"right_label\": rl,\n        \"accuracy\": round(acc, 6),\n    }\n",
    "explanation": "<p>Real tree learners do exactly this per feature per node (with impurity like Gini instead of raw accuracy, and a cleverer O(n log n) sweep). The precision of the spec — midpoint candidates, ≤ on the left, deterministic tie-breaks — is what makes tree implementations reproducible across libraries.</p>"
  },
  "cases": [
    {
      "args": [
        [
          1,
          2,
          8,
          9
        ],
        [
          0,
          0,
          1,
          1
        ]
      ],
      "expected": {
        "threshold": 5.0,
        "left_label": 0,
        "right_label": 1,
        "accuracy": 1.0
      },
      "sample": true
    },
    {
      "args": [
        [
          1,
          2,
          3,
          4
        ],
        [
          1,
          1,
          0,
          0
        ]
      ],
      "expected": {
        "threshold": 2.5,
        "left_label": 1,
        "right_label": 0,
        "accuracy": 1.0
      },
      "sample": true
    },
    {
      "args": [
        [
          5,
          1,
          9,
          3,
          7
        ],
        [
          0,
          0,
          1,
          0,
          1
        ]
      ],
      "expected": {
        "threshold": 6.0,
        "left_label": 0,
        "right_label": 1,
        "accuracy": 1.0
      },
      "sample": false
    },
    {
      "args": [
        [
          1,
          2,
          3,
          4,
          5,
          6
        ],
        [
          0,
          1,
          0,
          1,
          0,
          1
        ]
      ],
      "expected": {
        "threshold": 1.5,
        "left_label": 0,
        "right_label": 1,
        "accuracy": 0.666667
      },
      "sample": false
    },
    {
      "args": [
        [
          2,
          2,
          4,
          4
        ],
        [
          0,
          1,
          1,
          1
        ]
      ],
      "expected": {
        "threshold": 3.0,
        "left_label": 0,
        "right_label": 1,
        "accuracy": 0.75
      },
      "sample": false
    },
    {
      "args": [
        [
          10,
          20
        ],
        [
          1,
          0
        ]
      ],
      "expected": {
        "threshold": 15.0,
        "left_label": 1,
        "right_label": 0,
        "accuracy": 1.0
      },
      "sample": false
    }
  ]
},
{
  "slug": "ml-precision-recall-f1",
  "name": "Precision, Recall, F1",
  "category": "Machine Learning",
  "difficulty": "Easy",
  "sub": "Metrics",
  "maxScore": 25,
  "successRate": "79.36%",
  "lang": "python",
  "fn": "classification_metrics",
  "statement": "\n<p><b>Why this matters:</b> accuracy lies. A spam filter that flags nothing is 99% \"accurate\" if 1% of mail is spam. So we split errors into two kinds: <em>precision</em> — of everything I flagged, how much was really spam? — and <em>recall</em> — of all real spam, how much did I catch? <em>F1</em> is their harmonic mean, which punishes you for being terrible at either one.</p>\n<p>Write <code>classification_metrics(tp, fp, fn)</code> from raw confusion counts (true positives, false positives, false negatives):</p>\n<pre>precision = tp / (tp + fp)\nrecall    = tp / (tp + fn)\nf1        = 2 * precision * recall / (precision + recall)</pre>\n<p>Whenever a denominator is 0, that metric is <code>0.0</code> (the standard sklearn <code>zero_division=0</code> convention). Return <code>{\"precision\", \"recall\", \"f1\"}</code> rounded to 6 decimals. All expected outputs in the tests are rounded to 6 decimals.</p>\n<h3>Example</h3>\n<pre>classification_metrics(90, 10, 30)\n-&gt;  {\"precision\": 0.9, \"recall\": 0.75, \"f1\": 0.818182}</pre>\n<h3>Goal</h3>\n<p>Trivial math, non-trivial understanding: be able to say <em>which</em> metric you'd optimize for a cancer screen (recall) vs. a spam filter (precision), and why F1 uses the harmonic — not arithmetic — mean.</p>",
  "starter": "def classification_metrics(tp, fp, fn):\n    # tp/fp/fn: non-negative ints\n    # Return {\"precision\", \"recall\", \"f1\"} rounded to 6 decimals,\n    # 0.0 whenever a denominator is 0.\n    # Write your code here\n    pass\n",
  "solution": {
    "code": "def classification_metrics(tp, fp, fn):\n    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0\n    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0\n    f1 = (2 * precision * recall / (precision + recall)\n          if (precision + recall) > 0 else 0.0)\n    return {\n        \"precision\": round(precision, 6),\n        \"recall\": round(recall, 6),\n        \"f1\": round(f1, 6),\n    }\n",
    "explanation": "<p>The harmonic mean drags F1 toward the worse of the two — precision 1.0 with recall 0.01 gives F1 ≈ 0.02, not 0.5. That is the design intent: you cannot buy a good F1 by maxing one metric and abandoning the other.</p>"
  },
  "cases": [
    {
      "args": [
        90,
        10,
        30
      ],
      "expected": {
        "precision": 0.9,
        "recall": 0.75,
        "f1": 0.818182
      },
      "sample": true
    },
    {
      "args": [
        50,
        50,
        50
      ],
      "expected": {
        "precision": 0.5,
        "recall": 0.5,
        "f1": 0.5
      },
      "sample": true
    },
    {
      "args": [
        0,
        0,
        0
      ],
      "expected": {
        "precision": 0.0,
        "recall": 0.0,
        "f1": 0.0
      },
      "sample": false
    },
    {
      "args": [
        0,
        5,
        10
      ],
      "expected": {
        "precision": 0.0,
        "recall": 0.0,
        "f1": 0.0
      },
      "sample": false
    },
    {
      "args": [
        100,
        0,
        0
      ],
      "expected": {
        "precision": 1.0,
        "recall": 1.0,
        "f1": 1.0
      },
      "sample": false
    },
    {
      "args": [
        1,
        2,
        3
      ],
      "expected": {
        "precision": 0.333333,
        "recall": 0.25,
        "f1": 0.285714
      },
      "sample": false
    }
  ]
},
{
  "slug": "ml-kfold-indices",
  "name": "K-Fold Split Indices",
  "category": "Machine Learning",
  "difficulty": "Medium",
  "sub": "Validation",
  "maxScore": 30,
  "successRate": "70.02%",
  "lang": "python",
  "fn": "kfold_indices",
  "statement": "\n<p><b>Why this matters:</b> one train/test split can get lucky. <em>K-fold cross-validation</em> deals every sample into k hands: train on k−1 of them, test on the held-out one, rotate k times, average the scores. Your job is the dealing — producing the index lists, which is exactly what sklearn's <code>KFold</code> does before any model ever runs.</p>\n<p>Write <code>kfold_indices(n, k)</code> for <code>n</code> samples (indices <code>0..n-1</code>, <strong>no shuffling</strong>) and <code>k</code> folds. Follow the sklearn convention: the first <code>n % k</code> folds have size <code>n // k + 1</code>, the rest have size <code>n // k</code>; folds are consecutive index blocks in order. Return a list of k dicts:</p>\n<pre>[{\"train\": [indices not in fold], \"test\": [indices in fold]}, ...]</pre>\n<p>Both lists in ascending order, folds in order (fold 0 first).</p>\n<h3>Example</h3>\n<pre>kfold_indices(5, 2)\n-&gt;  [{\"train\": [3, 4], \"test\": [0, 1, 2]},\n    {\"train\": [0, 1, 2], \"test\": [3, 4]}]</pre>\n<h3>Goal</h3>\n<p>Get the uneven-fold arithmetic right (5 samples, 2 folds → sizes 3 and 2). <code>np.array_split(np.arange(n), k)</code> implements exactly this convention — but write the size logic yourself first, then check against it.</p>",
  "starter": "import numpy as np\n\ndef kfold_indices(n, k):\n    # n samples (0..n-1, in order), k folds, sklearn sizing:\n    # first n % k folds get n//k + 1 indices, the rest get n//k.\n    # Return [{\"train\": [...], \"test\": [...]}, ...] for each fold in order.\n    # Write your code here\n    pass\n",
  "solution": {
    "code": "import numpy as np\n\ndef kfold_indices(n, k):\n    idx = np.arange(n)\n    base, extra = divmod(n, k)     # first `extra` folds get one more sample\n    folds = []\n    start = 0\n    for f in range(k):\n        size = base + (1 if f < extra else 0)\n        test = idx[start:start + size]\n        train = np.concatenate([idx[:start], idx[start + size:]])\n        folds.append({\"train\": train.tolist(), \"test\": test.tolist()})\n        start += size\n    return folds\n",
    "explanation": "<p><code>divmod(n, k)</code> gives the fold sizing in one line; each fold's train set is everything outside its contiguous test block. In practice you shuffle indices first (with a fixed seed) — omitted here so the output is deterministic and checkable.</p>"
  },
  "cases": [
    {
      "args": [
        5,
        2
      ],
      "expected": [
        {
          "train": [
            3,
            4
          ],
          "test": [
            0,
            1,
            2
          ]
        },
        {
          "train": [
            0,
            1,
            2
          ],
          "test": [
            3,
            4
          ]
        }
      ],
      "sample": true
    },
    {
      "args": [
        6,
        3
      ],
      "expected": [
        {
          "train": [
            2,
            3,
            4,
            5
          ],
          "test": [
            0,
            1
          ]
        },
        {
          "train": [
            0,
            1,
            4,
            5
          ],
          "test": [
            2,
            3
          ]
        },
        {
          "train": [
            0,
            1,
            2,
            3
          ],
          "test": [
            4,
            5
          ]
        }
      ],
      "sample": true
    },
    {
      "args": [
        7,
        3
      ],
      "expected": [
        {
          "train": [
            3,
            4,
            5,
            6
          ],
          "test": [
            0,
            1,
            2
          ]
        },
        {
          "train": [
            0,
            1,
            2,
            5,
            6
          ],
          "test": [
            3,
            4
          ]
        },
        {
          "train": [
            0,
            1,
            2,
            3,
            4
          ],
          "test": [
            5,
            6
          ]
        }
      ],
      "sample": false
    },
    {
      "args": [
        4,
        4
      ],
      "expected": [
        {
          "train": [
            1,
            2,
            3
          ],
          "test": [
            0
          ]
        },
        {
          "train": [
            0,
            2,
            3
          ],
          "test": [
            1
          ]
        },
        {
          "train": [
            0,
            1,
            3
          ],
          "test": [
            2
          ]
        },
        {
          "train": [
            0,
            1,
            2
          ],
          "test": [
            3
          ]
        }
      ],
      "sample": false
    },
    {
      "args": [
        10,
        4
      ],
      "expected": [
        {
          "train": [
            3,
            4,
            5,
            6,
            7,
            8,
            9
          ],
          "test": [
            0,
            1,
            2
          ]
        },
        {
          "train": [
            0,
            1,
            2,
            6,
            7,
            8,
            9
          ],
          "test": [
            3,
            4,
            5
          ]
        },
        {
          "train": [
            0,
            1,
            2,
            3,
            4,
            5,
            8,
            9
          ],
          "test": [
            6,
            7
          ]
        },
        {
          "train": [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7
          ],
          "test": [
            8,
            9
          ]
        }
      ],
      "sample": false
    }
  ]
}
  ];
  for (var i = 0; i < problems.length; i++) M.push(problems[i]);
})();
