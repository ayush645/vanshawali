const { User, TreeMember } = require('../models/allModels');
const { jwt } = require('../config/utils');

// --- Auth and Admin Middleware ---

/** * Middleware: Verifies JWT, attaches user data to request. 
 * Requires: Token in Authorization header.
 */
exports.authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication required: Token missing.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token);
        // Attach user object to request
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            return res.status(401).json({ message: 'User not found.' });
        }
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

/** * Middleware: Checks if the authenticated user has 'admin' role. 
 * Requires: authMiddleware to run first.
 */
exports.adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden: Admin privilege required.' });
    }
    next();
};

// --- Tree Validator Middleware ---

const MAX_FREE_GENERATIONS = 3;

/** 
 * Middleware: Checks the 3-generation freemium limit before adding a tree member.
 * Calculates generation depth from root and blocks if limit exceeded.
 */
exports.checkLevelLimit = async (req, res, next) => {
  const { relation, targetId, isRoot } = req.body;

  // ROOT MEMBER - always allowed
  if (isRoot === true) {
    return next();
  }

  // Check if user has premium subscription
  if (req.user.isPremium || req.user.subscriptionTier === 'premium' || req.user.subscriptionTier === 'lifetime') {
    return next();
  }

  // If no relation/target, allow (shouldn't happen but safe)
  if (!relation || !targetId) {
    return next();
  }

  try {
    // Get the target member
    const target = await TreeMember.findById(targetId);
    if (!target) {
      return res.status(404).json({ message: 'Target member not found.' });
    }

    // Calculate generation depth from root
    const calculateGenerationDepth = async (memberId) => {
      let depth = 1;
      let current = await TreeMember.findById(memberId);
      
      while (current && (current.father || current.mother)) {
        const parentId = current.father || current.mother;
        current = await TreeMember.findById(parentId);
        if (!current) break;
        depth++;
      }
      
      return depth;
    };

    const targetDepth = await calculateGenerationDepth(targetId);
    
    // Calculate new member's depth based on relation
    let newMemberDepth;
    if (relation === 'child') {
      newMemberDepth = targetDepth + 1;
    } else if (relation === 'spouse') {
      newMemberDepth = targetDepth; // Same generation
    } else if (relation === 'parent') {
      newMemberDepth = targetDepth - 1;
    } else {
      newMemberDepth = targetDepth;
    }

    // Check if exceeds free limit
    if (newMemberDepth > MAX_FREE_GENERATIONS) {
      return res.status(403).json({
        message: 'Subscription Required',
        detail: `Free users can add up to ${MAX_FREE_GENERATIONS} generations. Upgrade to Premium to add unlimited generations.`,
        currentGeneration: targetDepth,
        maxFreeGenerations: MAX_FREE_GENERATIONS,
        requiresSubscription: true,
      });
    }

    next();
  } catch (error) {
    console.error('Generation limit check error:', error);
    return res.status(500).json({ message: 'Failed to check generation limit' });
  }
};
