const { User, OTP, Community, TreeMember, Memory, SubscriptionPlan, Subscription, Notification, Announcement, Referral, CorrectionRequest } = require('../models/allModels');
const { bcrypt, jwt, generateOTP, sendEmail, Razorpay } = require('../config/utils');
const cloudinary = require('../config/cloudinary');
const { sendNotificationToUser, sendNotificationToUsers } = require('../config/firebase');

// Helper function to generate unique referral code
function generateReferralCode() {
    return 'REF' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Helper function to calculate profile completion
function calculateProfileCompletion(user) {
    const fields = ['name', 'surname', 'village', 'city', 'caste', 'bio', 'profilePhoto', 'community'];
    const completed = fields.filter(field => user[field]).length;
    return Math.round((completed / fields.length) * 100);
}

// Helper function to create notification with push notification
async function createNotificationWithPush(userId, type, title, message, data = {}) {
    try {
        // Create database notification
        const notification = await Notification.create({
            user: userId,
            type,
            title,
            message,
            data,
        });

        // Send push notification
        try {
            await sendNotificationToUser(userId, title, message, {
                type,
                notificationId: notification._id.toString(),
                ...data,
            });
        } catch (pushError) {
            console.error('Failed to send push notification:', pushError);
            // Don't fail the whole operation if push notification fails
        }

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

exports.authController = {
    // Email registration with OTP
    register: async (req, res) => {
        try {
            const { email, password, name, referralCode } = req.body;
            
            if (await User.findOne({ email })) {
                return res.status(400).json({ message: 'Email already registered' });
            }
            
            const hashedPassword = await bcrypt.hash(password);
            const userReferralCode = generateReferralCode();
            
            const userData = {
                email,
                password: hashedPassword,
                name,
                authProvider: 'email',
                referralCode: userReferralCode,
            };
            
            // Handle referral
            if (referralCode) {
                const referrer = await User.findOne({ referralCode });
                if (referrer) {
                    userData.referredBy = referrer._id;
                }
            }
            
            await User.create(userData);
            
            const otpCode = generateOTP();
            await OTP.findOneAndUpdate({ email }, { code: otpCode }, { upsert: true });
            sendEmail(email, otpCode);
            
            res.status(201).json({ message: 'OTP sent to email' });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Verify OTP and complete registration
    verifyOTP: async (req, res) => {
        try {
            const { email, otp } = req.body;
            const otpDoc = await OTP.findOne({ email, code: otp });
            
            if (!otpDoc) {
                return res.status(400).json({ message: 'Invalid or expired OTP' });
            }
            
            const user = await User.findOneAndUpdate(
                { email },
                { isVerified: true },
                { new: true }
            ).select('-password');
            
            await OTP.deleteOne({ email });
            
            // Award referral points
            if (user.referredBy) {
                await User.findByIdAndUpdate(user.referredBy, {
                    $inc: { referralPoints: 10 }
                });
                
                await Referral.create({
                    referrer: user.referredBy,
                    referred: user._id,
                    pointsEarned: 10,
                    status: 'completed',
                });
                
                await createNotificationWithPush(
                    user.referredBy,
                    'referral_earned',
                    'Referral Bonus!',
                    `You earned 10 points for referring ${user.name}`
                );
            }
            
            const token = jwt.sign({ id: user._id, role: user.role });
            res.status(200).json({ token, user });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Email login
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email, isDeleted: { $ne: true } });
            
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            
            if (!user.isVerified) {
                return res.status(403).json({ message: 'Please verify your email first' });
            }
            
            if (user.isBlocked) {
                return res.status(403).json({ message: 'Your account has been blocked' });
            }
            
            const token = jwt.sign({ id: user._id, role: user.role });
            const userResponse = user.toObject();
            delete userResponse.password;
            
            res.status(200).json({ token, user: userResponse });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Social login (Google/Apple)
    socialLogin: async (req, res) => {
        try {
            const { provider, providerId, email, name, referralCode } = req.body;
            
            if (!['google', 'apple'].includes(provider)) {
                return res.status(400).json({ message: 'Invalid provider' });
            }
            
            const providerField = provider === 'google' ? 'googleId' : 'appleId';
            let user = await User.findOne({ [providerField]: providerId });
            
            if (!user) {
                user = await User.findOne({ email });
                
                if (user) {
                    user[providerField] = providerId;
                    user.authProvider = provider;
                    await user.save();
                } else {
                    const userReferralCode = generateReferralCode();
                    const userData = {
                        email,
                        name,
                        [providerField]: providerId,
                        authProvider: provider,
                        isVerified: true,
                        referralCode: userReferralCode,
                    };
                    
                    if (referralCode) {
                        const referrer = await User.findOne({ referralCode });
                        if (referrer) {
                            userData.referredBy = referrer._id;
                        }
                    }
                    
                    user = await User.create(userData);
                    
                    if (user.referredBy) {
                        await User.findByIdAndUpdate(user.referredBy, {
                            $inc: { referralPoints: 10 }
                        });
                        
                        await Referral.create({
                            referrer: user.referredBy,
                            referred: user._id,
                            pointsEarned: 10,
                            status: 'completed',
                        });
                    }
                }
            }
            
            if (user.isBlocked) {
                return res.status(403).json({ message: 'Your account has been blocked' });
            }
            
            const token = jwt.sign({ id: user._id, role: user.role });
            const userResponse = user.toObject();
            delete userResponse.password;
            
            res.status(200).json({
                token,
                user: userResponse,
                isNewUser: !user.profileCompleted,
            });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Complete profile (finish signup)
    completeProfile: async (req, res) => {
        try {
            const { name, surname, village, city, caste, community, preferredLanguage, acceptedTerms } = req.body;
            
            if (!acceptedTerms) {
                return res.status(400).json({ message: 'You must accept terms and privacy policy' });
            }
            
            const updateData = {
                profileCompleted: true,
            };
            
            if (name) updateData.name = name;
            if (surname) updateData.surname = surname;
            if (village) updateData.village = village;
            if (city) updateData.city = city;
            if (caste) updateData.caste = caste;
            if (community) updateData.community = community;
            if (preferredLanguage) updateData.preferredLanguage = preferredLanguage;
            
            const user = await User.findByIdAndUpdate(
                req.user._id,
                updateData,
                { new: true }
            ).select('-password');
            
            res.json({ message: 'Profile completed successfully', user });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Resend OTP
    resendOTP: async (req, res) => {
        try {
            const { email } = req.body;
            const user = await User.findOne({ email });
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            if (user.isVerified) {
                return res.status(400).json({ message: 'Email already verified' });
            }
            
            const otpCode = generateOTP();
            await OTP.findOneAndUpdate({ email }, { code: otpCode }, { upsert: true });
            sendEmail(email, otpCode);
            
            res.json({ message: 'OTP resent successfully' });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Get current user
    getMe: async (req, res) => {
        try {
            const user = await User.findById(req.user._id)
                .select('-password')
                .populate('community', 'name description');
            
            const profileCompletion = calculateProfileCompletion(user);
            
            res.json({
                user: {
                    ...user.toObject(),
                    profileCompletion,
                }
            });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
};

exports.communityController = {
    create: async (req, res) => {
        const comm = await Community.create({ ...req.body, admin: req.user._id });
        res.status(201).json(comm);
    },
    getAll: async (req, res) => {
        const communities = await Community.find({ isDeleted: { $ne: true } });
        res.json(communities);
    },
    getById: async (req, res) => {
        try {
            const community = await Community.findOne({ 
                _id: req.params.id, 
                isDeleted: { $ne: true } 
            }).populate('admin', 'name email');
            
            if (!community) {
                return res.status(404).json({ message: 'Community not found' });
            }
            
            res.json({ community });
        } catch (error) {
            console.error('Error fetching community:', error);
            res.status(500).json({ message: 'Failed to fetch community' });
        }
    },
    join: async (req, res) => {
        try {
            const communityId = req.body.community_id;
            
            // Check if community exists
            const community = await Community.findById(communityId);
            if (!community) {
                return res.status(404).json({ message: 'Community not found' });
            }
            
            // Check if user is already a member of this community
            const currentUser = await User.findById(req.user._id);
            const wasAlreadyMember = currentUser.community?.toString() === communityId;
            
            // Update user's community
            const user = await User.findByIdAndUpdate(
                req.user._id,
                { community: communityId },
                { new: true }
            ).select('-password');
            
            // Increment totalMembers only if user wasn't already a member
            if (!wasAlreadyMember) {
                await Community.findByIdAndUpdate(
                    communityId,
                    { $inc: { totalMembers: 1 } }
                );
                
                // Create notification
                await Notification.create({
                    user: req.user._id,
                    type: 'community_join',
                    title: 'Welcome to Community!',
                    message: `You have successfully joined ${community.name}`,
                });
            }
            
            res.json({ message: 'Joined successfully', user });
        } catch (error) {
            console.error('Error joining community:', error);
            res.status(500).json({ message: 'Failed to join community' });
        }
    },
    
    leave: async (req, res) => {
        try {
            const communityId = req.body.community_id;
            
            // Check if user is a member of this community
            const currentUser = await User.findById(req.user._id);
            if (currentUser.community?.toString() !== communityId) {
                return res.status(400).json({ message: 'You are not a member of this community' });
            }
            
            // Get community name for notification
            const community = await Community.findById(communityId);
            
            // Remove user from community
            const user = await User.findByIdAndUpdate(
                req.user._id,
                { $unset: { community: 1 } },
                { new: true }
            ).select('-password');
            
            // Decrement totalMembers
            await Community.findByIdAndUpdate(
                communityId,
                { $inc: { totalMembers: -1 } }
            );
            
            // Create notification
            if (community) {
                await Notification.create({
                    user: req.user._id,
                    type: 'system',
                    title: 'Left Community',
                    message: `You have left ${community.name}`,
                });
            }
            
            res.json({ message: 'Left community successfully', user });
        } catch (error) {
            console.error('Error leaving community:', error);
            res.status(500).json({ message: 'Failed to leave community' });
        }
    }
};

// Dashboard Controller
exports.dashboardController = {
    // Get dashboard home data
    getHome: async (req, res) => {
        try {
            const user = await User.findById(req.user._id)
                .select('-password')
                .populate('community', 'name description');
            
            // Profile completion
            const profileCompletion = calculateProfileCompletion(user);
            const missingFields = [];
            if (!user.surname) missingFields.push('surname');
            if (!user.village) missingFields.push('village');
            if (!user.city) missingFields.push('city');
            if (!user.caste) missingFields.push('caste');
            if (!user.bio) missingFields.push('bio');
            if (!user.profilePhoto) missingFields.push('profilePhoto');
            if (!user.community) missingFields.push('community');
            
            // Recent notifications (last 5)
            const notifications = await Notification.find({ user: req.user._id })
                .sort({ createdAt: -1 })
                .limit(5);
            
            const unreadCount = await Notification.countDocuments({
                user: req.user._id,
                isRead: false,
            });
            
            // Referral stats
            const referralStats = {
                code: user.referralCode,
                points: user.referralPoints,
                totalReferred: await Referral.countDocuments({ referrer: req.user._id }),
            };
            
            // Subscription status
            const subscription = {
                tier: user.subscriptionTier,
                isPremium: user.isPremium,
                features: user.subscriptionTier === 'free'
                    ? ['Up to 3 levels', 'Basic features']
                    : ['Unlimited levels', 'Advanced features', 'Priority support'],
            };
            
            // Active announcements
            const announcements = await Announcement.find({
                isActive: true,
                $or: [
                    { targetAudience: 'all' },
                    { targetAudience: user.isPremium ? 'premium' : 'free' },
                ],
                $or: [
                    { expiresAt: { $exists: false } },
                    { expiresAt: { $gt: new Date() } },
                ],
            }).sort({ createdAt: -1 }).limit(3);
            
            // Tree stats
            const treeStats = {
                hasTree: !!user.treeRootId,
                rootId: user.treeRootId,
                totalMembers: user.treeRootId
                    ? await TreeMember.countDocuments({
                        community: user.community,
                        isDeleted: { $ne: true },
                    })
                    : 0,
            };
            
            res.json({
                user: {
                    name: user.name,
                    email: user.email,
                    preferredLanguage: user.preferredLanguage,
                },
                profileCompletion: {
                    percentage: profileCompletion,
                    missingFields,
                },
                notifications: {
                    recent: notifications,
                    unreadCount,
                },
                referral: referralStats,
                subscription,
                announcements,
                treeStats,
                quickActions: [
                    {
                        id: 'tree',
                        title: treeStats.hasTree ? 'Continue Family Tree' : 'Create Family Tree',
                        icon: 'tree',
                        route: '/tree',
                    },
                    {
                        id: 'community',
                        title: 'Community Directory',
                        icon: 'users',
                        route: '/communities',
                    },
                    {
                        id: 'memories',
                        title: 'Memories',
                        icon: 'image',
                        route: '/memories',
                    },
                ],
            });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Get all notifications
    getNotifications: async (req, res) => {
        try {
            console.log('📬 Fetching notifications for user:', req.user._id);
            
            const notifications = await Notification.find({ user: req.user._id })
                .sort({ createdAt: -1 })
                .limit(50);
            
            console.log(`📋 Found ${notifications.length} notifications`);
            
            res.json({ notifications });
        } catch (e) {
            console.error('❌ Error fetching notifications:', e);
            res.status(500).json({ message: e.message });
        }
    },
    
    // Mark notification as read
    markNotificationRead: async (req, res) => {
        try {
            await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
            res.json({ message: 'Notification marked as read' });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Mark all notifications as read
    markAllNotificationsRead: async (req, res) => {
        try {
            await Notification.updateMany(
                { user: req.user._id, isRead: false },
                { isRead: true }
            );
            res.json({ message: 'All notifications marked as read' });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Delete notification
    deleteNotification: async (req, res) => {
        try {
            await Notification.findOneAndDelete({
                _id: req.params.id,
                user: req.user._id
            });
            res.json({ message: 'Notification deleted' });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Get referral stats
    getReferralStats: async (req, res) => {
        try {
            const user = await User.findById(req.user._id).select('referralCode referralPoints');
            const referrals = await Referral.find({ referrer: req.user._id })
                .populate('referred', 'name email createdAt')
                .sort({ createdAt: -1 });
            
            res.json({
                code: user.referralCode,
                points: user.referralPoints,
                totalReferred: referrals.length,
                referrals,
            });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
};


async function buildTree(memberId, visited = new Set()) {
  if (visited.has(String(memberId))) return null;
  visited.add(String(memberId));

  const member = await TreeMember.findOne({ _id: memberId, isDeleted: { $ne: true } })
    .populate({
      path: 'spouse',
      match: { isDeleted: { $ne: true } }
    })
    .populate('father')
    .populate('mother')
    .lean();

  if (!member) return null;

  const children = await TreeMember.find({
    $or: [{ father: member._id }, { mother: member._id }],
    isDeleted: { $ne: true },
  });

  const childrenTree = await Promise.all(
    children.map(child => buildTree(child._id, visited))
  );

  return {
    ...member,
    children: childrenTree.filter(Boolean),
  };
}


exports.treeController = {

  add: async (req, res) => {
    try {
      if (!req.user.community) {
        return res.status(400).json({ message: 'Join a community first' });
      }

      const { relation, targetId, isRoot, name, gender, dateOfBirth, occupation, bio, treeName, treeIsPublic } = req.body;

      // Create the new member
      const member = await TreeMember.create({
        community: req.user.community,
        addedBy: req.user._id,
        name,
        gender,
        dob: dateOfBirth ? new Date(dateOfBirth) : undefined,
        occupation,
        bio,
      });

      // Handle root member
      if (isRoot === true) {
        const user = await User.findById(req.user._id);
        user.treeRootId = member._id;
        
        // Set tree name and privacy if provided
        if (treeName) user.treeName = treeName;
        if (typeof treeIsPublic !== 'undefined') user.treeIsPublic = treeIsPublic;
        
        await user.save();
        return res.status(201).json(member);
      }

      // Handle relationships
      if (relation && targetId) {
        const target = await TreeMember.findById(targetId);
        if (!target) {
          return res.status(404).json({ message: 'Target member not found' });
        }

        if (relation === 'spouse') {
          // Check if target already has a non-deleted spouse
          if (target.spouse) {
            const existingSpouse = await TreeMember.findOne({
              _id: target.spouse,
              isDeleted: { $ne: true }
            });
            
            if (existingSpouse) {
              await TreeMember.findByIdAndDelete(member._id);
              return res.status(400).json({ message: 'This person already has a spouse' });
            }
          }
          
          member.spouse = target._id;
          target.spouse = member._id;
          await target.save();
          await member.save();
        }

        else if (relation === 'child') {
          // Determine parents based on target's gender and spouse
          if (target.gender === 'male') {
            member.father = target._id;
            // If target has spouse, set as mother
            if (target.spouse) {
              member.mother = target.spouse;
            }
          } else if (target.gender === 'female') {
            member.mother = target._id;
            // If target has spouse, set as father
            if (target.spouse) {
              member.father = target.spouse;
            }
          } else {
            // For 'other' gender, just set as father
            member.father = target._id;
            if (target.spouse) {
              member.mother = target.spouse;
            }
          }
          await member.save();
        }

        else if (relation === 'parent') {
          // Add parent to target
          if (gender === 'male') {
            target.father = member._id;
          } else {
            target.mother = member._id;
          }
          await target.save();
          await member.save();
        }
      }

      res.status(201).json(member);
    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json({ message: 'Failed to add member' });
    }
  },

  // Get tree structure for UI
  getTreeForUI: async (req, res) => {
    try {
      const rootId = req.params.id;
      const tree = await buildTree(rootId);

      if (!tree) {
        return res.status(404).json({ message: 'Tree not found' });
      }

      res.json(tree);
    } catch (err) {
      console.error('Tree fetch error:', err);
      res.status(500).json({ message: 'Failed to load tree' });
    }
  },

  // Get single member details
  getMemberById: async (req, res) => {
    try {
      const member = await TreeMember.findById(req.params.id)
        .populate('spouse', 'name gender dob occupation bio')
        .populate('father', 'name gender')
        .populate('mother', 'name gender')
        .lean();

      if (!member || member.isDeleted) {
        return res.status(404).json({ message: 'Member not found' });
      }

      // Get children
      const children = await TreeMember.find({
        $or: [{ father: member._id }, { mother: member._id }],
        isDeleted: { $ne: true },
      }).select('name gender dob');

      res.json({
        ...member,
        children,
      });
    } catch (error) {
      console.error('Get member error:', error);
      res.status(500).json({ message: 'Failed to fetch member' });
    }
  },

  update: async (req, res) => {
    try {
      const updateData = {
        name: req.body.name,
      };

      // Only update fields that are provided
      if (req.body.gender) updateData.gender = req.body.gender;
      if (req.body.dob || req.body.dateOfBirth) {
        updateData.dob = new Date(req.body.dob || req.body.dateOfBirth);
      }
      if (req.body.occupation !== undefined) updateData.occupation = req.body.occupation;
      if (req.body.bio !== undefined) updateData.bio = req.body.bio;

      const member = await TreeMember.findOneAndUpdate(
        { _id: req.params.id, isDeleted: { $ne: true } },
        updateData,
        { new: true }
      );

      if (!member) {
        return res.status(404).json({ message: 'Member not found' });
      }

      res.json(member);
    } catch (error) {
      console.error('Update member error:', error);
      res.status(500).json({ message: 'Failed to update member', error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const member = await TreeMember.findOneAndUpdate(
        { _id: req.params.id, isDeleted: { $ne: true } },
        { isDeleted: true },
        { new: true }
      );

      if (!member) {
        return res.status(404).json({ message: 'Member not found' });
      }

      // If member has a spouse, clear the spouse reference from the spouse's record
      if (member.spouse) {
        await TreeMember.findByIdAndUpdate(
          member.spouse,
          { $unset: { spouse: 1 } }
        );
      }

      res.json({ message: 'Member removed (soft delete)' });
    } catch (error) {
      console.error('Delete member error:', error);
      res.status(500).json({ message: 'Failed to delete member' });
    }
  },

  // Update tree settings (name and privacy)
  updateTreeSettings: async (req, res) => {
    try {
      const { treeName, treeIsPublic } = req.body;
      
      const updateData = {};
      if (treeName !== undefined) updateData.treeName = treeName;
      if (treeIsPublic !== undefined) updateData.treeIsPublic = treeIsPublic;
      
      const user = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true }
      ).select('-password');
      
      res.json({ message: 'Tree settings updated', user });
    } catch (error) {
      console.error('Update tree settings error:', error);
      res.status(500).json({ message: 'Failed to update tree settings' });
    }
  },

  // Get all public trees
  getPublicTrees: async (req, res) => {
    try {
      const { search } = req.query;
      
      const query = {
        treeRootId: { $exists: true, $ne: null },
        treeIsPublic: true,
        isDeleted: { $ne: true },
      };
      
      // Add search filter if provided
      if (search) {
        query.$or = [
          { treeName: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
        ];
      }
      
      const publicTrees = await User.find(query)
        .select('name treeName treeRootId community createdAt')
        .populate('community', 'name')
        .sort({ createdAt: -1 })
        .limit(50);
      
      res.json({ trees: publicTrees });
    } catch (error) {
      console.error('Get public trees error:', error);
      res.status(500).json({ message: 'Failed to fetch public trees' });
    }
  },

  // Get public tree by user ID (view-only)
  getPublicTreeByUserId: async (req, res) => {
    try {
      const { userId } = req.params;
      
      const treeOwner = await User.findOne({
        _id: userId,
        treeRootId: { $exists: true, $ne: null },
        treeIsPublic: true,
        isDeleted: { $ne: true },
      }).select('name treeName treeRootId community');
      
      if (!treeOwner) {
        return res.status(404).json({ message: 'Public tree not found' });
      }
      
      const tree = await buildTree(treeOwner.treeRootId);
      
      if (!tree) {
        return res.status(404).json({ message: 'Tree data not found' });
      }
      
      res.json({
        tree,
        owner: {
          _id: treeOwner._id,
          name: treeOwner.name,
          treeName: treeOwner.treeName,
          community: treeOwner.community,
        },
        isOwner: req.user._id.toString() === userId,
      });
    } catch (error) {
      console.error('Get public tree error:', error);
      res.status(500).json({ message: 'Failed to fetch public tree' });
    }
  }
};


exports.memoryController = {
  /* =======================
     CREATE MEMORY
  ======================= */
  post: async (req, res) => {
    console.log('--- MEMORY POST HIT ---');

    console.log('USER:', req.user);
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);

    if (!req.user.community) {
      console.log('❌ USER HAS NO COMMUNITY');
      return res.status(400).json({ message: 'Join a community first' });
    }

    if (!req.file) {
      console.log('❌ FILE NOT RECEIVED');
      return res.status(400).json({ message: 'Image is required' });
    }

    const memory = await Memory.create({
      community: req.user.community,
      postedBy: req.user._id,
      imageUrl: req.file.path,
      imagePublicId: req.file.filename,
      personName: req.body.personName,
      whoIsThis: req.body.whoIsThis,
      description: req.body.description,
    });

    console.log('✅ MEMORY CREATED:', memory._id);

    res.status(201).json(memory);
  },


  /* =======================
     GET ALL MEMORIES
  ======================= */
  getAll: async (req, res) => {
    try {
      const memories = await Memory.find({
        postedBy: req.user._id, // Only get memories posted by the current user
      })
        .populate('postedBy', 'name')
        .sort({ createdAt: -1 });

      res.json(memories);
    } catch (error) {
      console.error('Fetch memories error:', error);
      res.status(500).json({ message: 'Failed to fetch memories' });
    }
  },

  /* =======================
     DELETE MEMORY
  ======================= */
  delete: async (req, res) => {
    try {
      const memory = await Memory.findById(req.params.id);

      if (!memory) {
        return res.status(404).json({ message: 'Memory not found' });
      }

      // 🔥 Delete image from Cloudinary
      if (memory.imagePublicId) {
        await cloudinary.uploader.destroy(memory.imagePublicId);
      }

      await memory.deleteOne();

      res.json({ message: 'Memory deleted successfully' });
    } catch (error) {
      console.error('Delete memory error:', error);
      res.status(500).json({ message: 'Failed to delete memory' });
    }
  },
};




exports.paymentController = {
    getPlans: async (req, res) => {
        try {
            // Get dynamic plans from database
            const plans = await SubscriptionPlan.find({ isActive: true })
                .sort({ displayOrder: 1, createdAt: 1 });

            // Always include free plan if not exists
            const freePlan = plans.find(p => p.planId === 'free');
            if (!freePlan) {
                plans.unshift({
                    planId: 'free',
                    name: 'Free',
                    price: 0,
                    currency: 'INR',
                    interval: 'lifetime',
                    features: ['Up to 3 generations', 'Basic tree features', 'Community access'],
                    description: 'Perfect for getting started',
                    isActive: true,
                    isPopular: false,
                    displayOrder: 0
                });
            }

            // Format for mobile app
            const formattedPlans = plans.map(plan => ({
                id: plan.planId,
                name: plan.name,
                price: plan.price,
                currency: plan.currency,
                interval: plan.interval === 'lifetime' ? undefined : plan.interval,
                features: plan.features || [],
                description: plan.description,
                popular: plan.isPopular,
                iapProductId: `com.familytree.${plan.planId}`,
            }));

            res.json(formattedPlans);
        } catch (error) {
            console.error('Get plans error:', error);
            res.status(500).json({ message: 'Failed to fetch plans' });
        }
    },
    
    // Verify In-App Purchase (iOS/Android)
    verifyIAP: async (req, res) => {
        try {
            const { platform, receipt, productId, transactionId } = req.body;
            
            if (!platform || !receipt || !productId) {
                return res.status(400).json({ message: 'Missing required fields' });
            }
            
            // In production, verify receipt with Apple/Google servers
            // For now, we'll accept the purchase
            
            // Determine subscription tier from productId
            let tier = 'premium';
            let interval = 'month';
            
            if (productId.includes('yearly')) {
                interval = 'year';
            } else if (productId.includes('lifetime')) {
                tier = 'lifetime';
                interval = 'lifetime';
            }
            
            // Update user subscription
            const user = await User.findByIdAndUpdate(
                req.user._id,
                {
                    isPremium: true,
                    subscriptionTier: tier,
                    subscriptionPlatform: platform,
                    subscriptionProductId: productId,
                },
                { new: true }
            );
            
            // Create subscription record
            await Subscription.create({
                user: req.user._id,
                planName: tier,
                amount: productId.includes('yearly') ? 99.99 : productId.includes('lifetime') ? 299.99 : 9.99,
                platform: platform,
                transactionId: transactionId,
                productId: productId,
                receipt: receipt,
                status: 'active',
                startDate: new Date(),
                expiryDate: interval === 'lifetime' ? null : new Date(Date.now() + (interval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000),
            });
            
            // Create notification
            await Notification.create({
                user: req.user._id,
                type: 'subscription',
                title: 'Subscription Activated',
                message: `Your ${tier} subscription has been activated successfully!`,
                relatedModel: 'User',
                relatedId: req.user._id,
            });
            
            res.json({ 
                message: 'Subscription activated successfully',
                user: {
                    isPremium: user.isPremium,
                    subscriptionTier: user.subscriptionTier,
                }
            });
        } catch (error) {
            console.error('IAP verification error:', error);
            res.status(500).json({ message: 'Failed to verify purchase' });
        }
    },
    
    // Get subscription status
    getSubscriptionStatus: async (req, res) => {
        try {
            const subscription = await Subscription.findOne({
                user: req.user._id,
                status: 'active',
            }).sort({ createdAt: -1 });
            
            res.json({
                isPremium: req.user.isPremium,
                subscriptionTier: req.user.subscriptionTier || 'free',
                subscription: subscription || null,
            });
        } catch (error) {
            console.error('Get subscription status error:', error);
            res.status(500).json({ message: 'Failed to get subscription status' });
        }
    },
    
    // Cancel subscription
    cancelSubscription: async (req, res) => {
        try {
            // Update user
            await User.findByIdAndUpdate(req.user._id, {
                isPremium: false,
                subscriptionTier: 'free',
            });
            
            // Update subscription record
            await Subscription.findOneAndUpdate(
                { user: req.user._id, status: 'active' },
                { status: 'cancelled', cancelledAt: new Date() }
            );
            
            res.json({ message: 'Subscription cancelled successfully' });
        } catch (error) {
            console.error('Cancel subscription error:', error);
            res.status(500).json({ message: 'Failed to cancel subscription' });
        }
    },
    
    subscribe: async (req, res) => {
        try {
            const { tier } = req.body;
            
            // Update user to premium
            await User.findByIdAndUpdate(req.user._id, { 
                isPremium: true,
                subscriptionTier: tier 
            });
            
            // Create subscription record
            await Subscription.create({
                user: req.user._id,
                planName: tier,
                amount: tier === 'lifetime' ? 299.99 : tier === 'premium_yearly' ? 99.99 : 9.99,
                razorpayOrderId: 'mock_order_' + Date.now(),
                razorpayPaymentId: 'mock_payment_' + Date.now(),
                status: 'active',
            });
            
            res.json({ message: 'Subscription activated successfully' });
        } catch (error) {
            console.error('Subscribe error:', error);
            res.status(500).json({ message: 'Failed to subscribe' });
        }
    },
    
    createOrder: async (req, res) => {
        try {
            const { planId, amount } = req.body;
            
            // Create real Razorpay order
            const order = await Razorpay.orders.create({
                amount: amount, // amount in paise
                currency: 'INR',
                receipt: `receipt_${Date.now()}`,
                notes: {
                    planId: planId,
                    userId: req.user._id.toString()
                }
            });
            
            console.log('✅ Real Razorpay order created:', order.id);
            
            // Save order to database
            await Subscription.create({ 
                user: req.user._id, 
                planName: planId,
                amount: amount / 100, // Convert paise to rupees
                razorpayOrderId: order.id,
                status: 'pending'
            });
            
            res.json(order);
        } catch (error) {
            console.error('Create order error:', error);
            res.status(500).json({ message: 'Failed to create order' });
        }
    },
    
    verify: async (req, res) => {
        try {
            const { planId, paymentId, orderId, signature } = req.body;
            
            // Verify payment signature using crypto
            const crypto = require('crypto');
            const { RAZORPAY_KEY_SECRET } = require('../config/utils');
            
            const body = orderId + "|" + paymentId;
            const expectedSignature = crypto
                .createHmac('sha256', RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest('hex');
            
            const isValid = expectedSignature === signature;
            
            if (!isValid) {
                console.error('❌ Invalid payment signature');
                return res.status(400).json({ message: 'Invalid payment signature' });
            }
            
            console.log('✅ Payment signature verified');
            
            // Fetch payment details from Razorpay
            const payment = await Razorpay.payments.fetch(paymentId);
            
            if (payment.status !== 'captured') {
                return res.status(400).json({ message: 'Payment not captured' });
            }
            
            // Update subscription status
            const subscription = await Subscription.findOneAndUpdate(
                { razorpayOrderId: orderId }, 
                { 
                    status: 'active', 
                    razorpayPaymentId: paymentId,
                    activatedAt: new Date()
                },
                { new: true }
            );
            
            if (!subscription) {
                return res.status(404).json({ message: 'Subscription not found' });
            }
            
            // Update user premium status
            const subscriptionTier = planId.includes('yearly') ? 'premium_yearly' : 
                                   planId.includes('lifetime') ? 'lifetime' : 'premium_monthly';
            
            await User.findByIdAndUpdate(req.user._id, { 
                isPremium: true,
                subscriptionTier: subscriptionTier,
                subscriptionStatus: 'active'
            });
            
            console.log('✅ Subscription activated for user:', req.user._id);
            
            res.json({ message: 'Payment verified and subscription activated' });
        } catch (error) {
            console.error('Verify payment error:', error);
            res.status(500).json({ message: 'Failed to verify payment' });
        }
    }
};

/* =========================
   USER CONTROLLER (Additional Methods)
========================= */

exports.userController = {
    // Update user language preference
    updateLanguage: async (req, res) => {
        try {
            const { preferredLanguage } = req.body;
            
            const validLanguages = ['en', 'hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'pa'];
            
            if (!validLanguages.includes(preferredLanguage)) {
                return res.status(400).json({ message: 'Invalid language code' });
            }
            
            const user = await User.findByIdAndUpdate(
                req.user._id,
                { preferredLanguage },
                { new: true }
            );
            
            res.json({ 
                message: 'Language updated successfully',
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    preferredLanguage: user.preferredLanguage
                }
            });
        } catch (error) {
            console.error('Update language error:', error);
            res.status(500).json({ message: 'Failed to update language' });
        }
    },

    // Change user password
    changePassword: async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ message: 'Current password and new password are required' });
            }
            
            if (newPassword.length < 6) {
                return res.status(400).json({ message: 'New password must be at least 6 characters long' });
            }
            
            // Get user with password
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }
            
            // Check if new password is different
            const isSamePassword = await bcrypt.compare(newPassword, user.password);
            if (isSamePassword) {
                return res.status(400).json({ message: 'New password must be different from current password' });
            }
            
            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword);
            
            // Update password
            await User.findByIdAndUpdate(req.user._id, { 
                password: hashedNewPassword,
                passwordChangedAt: new Date()
            });
            
            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ message: 'Failed to change password' });
        }
    },

    // Get user privacy settings
    getPrivacySettings: async (req, res) => {
        try {
            const user = await User.findById(req.user._id).select('privacySettings');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({ 
                settings: user.privacySettings || {
                    treeVisibility: 'family',
                    profileVisibility: 'community',
                    contactVisibility: 'private',
                    memoryVisibility: 'family',
                }
            });
        } catch (error) {
            console.error('Get privacy settings error:', error);
            res.status(500).json({ message: 'Failed to get privacy settings' });
        }
    },

    // Update user privacy settings
    updatePrivacySettings: async (req, res) => {
        try {
            const { treeVisibility, profileVisibility, contactVisibility, memoryVisibility } = req.body;
            
            const validLevels = ['public', 'community', 'family', 'private'];
            
            // Validate privacy levels
            if (treeVisibility && !validLevels.includes(treeVisibility)) {
                return res.status(400).json({ message: 'Invalid tree visibility level' });
            }
            if (profileVisibility && !validLevels.includes(profileVisibility)) {
                return res.status(400).json({ message: 'Invalid profile visibility level' });
            }
            if (contactVisibility && !validLevels.includes(contactVisibility)) {
                return res.status(400).json({ message: 'Invalid contact visibility level' });
            }
            if (memoryVisibility && !validLevels.includes(memoryVisibility)) {
                return res.status(400).json({ message: 'Invalid memory visibility level' });
            }
            
            const privacySettings = {};
            if (treeVisibility) privacySettings['privacySettings.treeVisibility'] = treeVisibility;
            if (profileVisibility) privacySettings['privacySettings.profileVisibility'] = profileVisibility;
            if (contactVisibility) privacySettings['privacySettings.contactVisibility'] = contactVisibility;
            if (memoryVisibility) privacySettings['privacySettings.memoryVisibility'] = memoryVisibility;
            
            const user = await User.findByIdAndUpdate(
                req.user._id,
                { $set: privacySettings },
                { new: true }
            ).select('privacySettings');
            
            res.json({ 
                message: 'Privacy settings updated successfully',
                settings: user.privacySettings
            });
        } catch (error) {
            console.error('Update privacy settings error:', error);
            res.status(500).json({ message: 'Failed to update privacy settings' });
        }
    },

    // Update user profile
    updateProfile: async (req, res) => {
        try {
            const { name, surname, city, village, caste, bio } = req.body;
            
            if (!name || !name.trim()) {
                return res.status(400).json({ message: 'Name is required' });
            }
            
            const updateData = {
                name: name.trim(),
            };
            
            if (surname !== undefined) updateData.surname = surname.trim();
            if (city !== undefined) updateData.city = city.trim();
            if (village !== undefined) updateData.village = village.trim();
            if (caste !== undefined) updateData.caste = caste.trim();
            if (bio !== undefined) updateData.bio = bio.trim();
            
            // Handle profile photo upload if present
            if (req.file) {
                // Upload to cloudinary
                const result = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'profile_photos',
                    transformation: [
                        { width: 400, height: 400, crop: 'fill' },
                        { quality: 'auto' }
                    ]
                });
                updateData.profilePhoto = result.secure_url;
            }
            
            const user = await User.findByIdAndUpdate(
                req.user._id,
                updateData,
                { new: true }
            ).select('-password');
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            // Calculate profile completion and update it separately
            const profileCompletion = calculateProfileCompletion(user);
            await User.findByIdAndUpdate(
                req.user._id,
                { profileCompletion },
                { new: false, runValidators: false }
            );
            
            res.json({ 
                message: 'Profile updated successfully',
                user: {
                    _id: user._id,
                    name: user.name,
                    surname: user.surname,
                    email: user.email,
                    city: user.city,
                    village: user.village,
                    caste: user.caste,
                    bio: user.bio,
                    profilePhoto: user.profilePhoto,
                    profileCompletion: profileCompletion
                }
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ message: 'Failed to update profile' });
        }
    },

    // ✅ Update FCM Token
    updateFCMToken: async (req, res) => {
        try {
            const { fcmToken } = req.body;
            const userId = req.user._id;

            if (!fcmToken) {
                return res.status(400).json({ message: 'FCM token is required' });
            }

            await User.findByIdAndUpdate(userId, { fcmToken });

            res.json({ message: 'FCM token updated successfully' });
        } catch (error) {
            console.error('Update FCM token error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // ✅ Test Notification (for testing Firebase setup)
    testNotification: async (req, res) => {
        try {
            const userId = req.user._id;
            
            await createNotificationWithPush(
                userId,
                'system',
                'Test Notification',
                'Firebase push notifications are working! 🎉'
            );

            res.json({ message: 'Test notification sent successfully' });
        } catch (error) {
            console.error('Test notification error:', error);
            res.status(500).json({ message: 'Failed to send test notification', error: error.message });
        }
    }
};



/* =========================
   ADMIN CONTROLLER (ADD THIS)
========================= */

exports.adminController = {

  /* =========================
     DASHBOARD STATS
  ========================= */
  dashboardStats: async (req, res) => {
    try {
      const [
        totalUsers,
        totalCommunities,
        premiumUsers,
        totalTreeMembers,
        totalMemories,
        totalReferrals,
      ] = await Promise.all([
        User.countDocuments({ isDeleted: { $ne: true } }),
        Community.countDocuments({ isDeleted: { $ne: true } }),
        User.countDocuments({ isPremium: true }),
        TreeMember.countDocuments({ isDeleted: { $ne: true } }),
        Memory.countDocuments(),
        Referral.countDocuments({ status: 'completed' }),
      ]);

      res.json({
        totalUsers,
        totalCommunities,
        premiumUsers,
        totalTreeMembers,
        totalMemories,
        totalReferrals,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /* =========================
     USERS
  ========================= */

  // ✅ Get all users
  getAllUsers: async (req, res) => {
    const users = await User.find({ isDeleted: { $ne: true } })
      .select('-password')
      .populate('community', 'name')
      .sort({ createdAt: -1 });

    res.json(users);
  },

  // ✅ Get single user
  getUserById: async (req, res) => {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('community', 'name');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  },

  // ✅ Block / Unblock user
  toggleUserBlock: async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      message: user.isBlocked ? 'User blocked' : 'User unblocked',
    });
  },

  // ✅ Soft delete user
  deleteUser: async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isDeleted = true;
    await user.save();

    res.json({ message: 'User removed (soft delete)' });
  },

  /* =========================
     COMMUNITIES
  ========================= */

  // ✅ Get all communities
  getAllCommunities: async (req, res) => {
    const communities = await Community.find({ isDeleted: { $ne: true } })
      .populate('admin', 'name email')
      .sort({ createdAt: -1 });

    res.json(communities);
  },

  // ✅ Update community
  updateCommunity: async (req, res) => {
    const community = await Community.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    res.json(community);
  },

  // ✅ Soft delete community
  deleteCommunity: async (req, res) => {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    community.isDeleted = true;
    await community.save();

    res.json({ message: 'Community removed (soft delete)' });
  },

  // ✅ Sync community member counts
  syncCommunityMembers: async (req, res) => {
    try {
      const communities = await Community.find({ isDeleted: { $ne: true } });
      let updatedCount = 0;
      const results = [];

      for (const community of communities) {
        const memberCount = await User.countDocuments({
          community: community._id,
          isDeleted: { $ne: true }
        });

        const oldCount = community.totalMembers;
        community.totalMembers = memberCount;
        await community.save();

        results.push({
          communityId: community._id,
          name: community.name,
          oldCount,
          newCount: memberCount,
          changed: oldCount !== memberCount
        });

        updatedCount++;
      }

      res.json({ 
        message: 'Community member counts synced successfully',
        updatedCount,
        results
      });
    } catch (error) {
      console.error('Error syncing community members:', error);
      res.status(500).json({ message: 'Failed to sync community members' });
    }
  },

  // ✅ Get users of a community
  getCommunityUsers: async (req, res) => {
    const users = await User.find({
      community: req.params.id,
      isDeleted: { $ne: true },
    })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  },

  /* =========================
     SUBSCRIPTIONS
  ========================= */

  // ✅ Get all subscriptions
  getAllSubscriptions: async (req, res) => {
    try {
      const subscriptions = await Subscription.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 });

      res.json(subscriptions);
    } catch (error) {
      console.error('Get subscriptions error:', error);
      res.status(500).json({ message: 'Failed to fetch subscriptions' });
    }
  },

  // ✅ SUBSCRIPTION PLANS MANAGEMENT
  
  // Get all subscription plans
  getAllPlans: async (req, res) => {
    try {
      const plans = await SubscriptionPlan.find()
        .sort({ displayOrder: 1, createdAt: 1 });

      res.json(plans);
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({ message: 'Failed to fetch plans' });
    }
  },

  // Create new subscription plan
  createPlan: async (req, res) => {
    try {
      const { name, planId, price, currency, interval, features, description, isPopular, displayOrder } = req.body;

      // Check if planId already exists
      const existingPlan = await SubscriptionPlan.findOne({ planId });
      if (existingPlan) {
        return res.status(400).json({ message: 'Plan ID already exists' });
      }

      const plan = await SubscriptionPlan.create({
        name,
        planId,
        price: parseFloat(price) || 0,
        currency: currency || 'INR',
        interval,
        features: Array.isArray(features) ? features : [],
        description,
        isPopular: Boolean(isPopular),
        displayOrder: parseInt(displayOrder) || 0,
        isActive: true
      });

      res.json(plan);
    } catch (error) {
      console.error('Create plan error:', error);
      res.status(500).json({ message: 'Failed to create plan' });
    }
  },

  // Update subscription plan
  updatePlan: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, planId, price, currency, interval, features, description, isPopular, displayOrder, isActive } = req.body;

      // Check if planId already exists (excluding current plan)
      if (planId) {
        const existingPlan = await SubscriptionPlan.findOne({ planId, _id: { $ne: id } });
        if (existingPlan) {
          return res.status(400).json({ message: 'Plan ID already exists' });
        }
      }

      const plan = await SubscriptionPlan.findByIdAndUpdate(
        id,
        {
          name,
          planId,
          price: parseFloat(price) || 0,
          currency: currency || 'INR',
          interval,
          features: Array.isArray(features) ? features : [],
          description,
          isPopular: Boolean(isPopular),
          displayOrder: parseInt(displayOrder) || 0,
          isActive: Boolean(isActive)
        },
        { new: true }
      );

      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      res.json(plan);
    } catch (error) {
      console.error('Update plan error:', error);
      res.status(500).json({ message: 'Failed to update plan' });
    }
  },

  // Delete subscription plan
  deletePlan: async (req, res) => {
    try {
      const { id } = req.params;

      const plan = await SubscriptionPlan.findById(id);
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      // Check if any users are subscribed to this plan
      const subscribedUsers = await Subscription.countDocuments({ planName: plan.planId, status: 'active' });
      if (subscribedUsers > 0) {
        return res.status(400).json({ 
          message: `Cannot delete plan. ${subscribedUsers} users are currently subscribed to this plan.` 
        });
      }

      await SubscriptionPlan.findByIdAndDelete(id);
      res.json({ message: 'Plan deleted successfully' });
    } catch (error) {
      console.error('Delete plan error:', error);
      res.status(500).json({ message: 'Failed to delete plan' });
    }
  },

  // Get subscribers for a specific plan
  getPlanSubscribers: async (req, res) => {
    try {
      const { planId } = req.params;

      const subscribers = await Subscription.find({ planName: planId })
        .populate('user', 'name email subscriptionTier isPremium')
        .sort({ createdAt: -1 });

      res.json(subscribers);
    } catch (error) {
      console.error('Get plan subscribers error:', error);
      res.status(500).json({ message: 'Failed to fetch subscribers' });
    }
  },

  // Create new subscription
  createSubscription: async (req, res) => {
    try {
      const { userId, tier, status, amount, startDate, endDate } = req.body;

      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create subscription
      const subscription = await Subscription.create({
        user: userId,
        planName: tier,
        status: status || 'active',
        amount: amount || 0,
        startDate: startDate || new Date(),
        endDate: endDate || null,
        platform: 'admin',
        productId: `admin_${tier}_${Date.now()}`
      });

      // Update user subscription status
      await User.findByIdAndUpdate(userId, {
        subscriptionTier: tier,
        isPremium: tier !== 'free'
      });

      // Create notification
      await Notification.create({
        user: userId,
        type: 'subscription',
        title: 'Subscription Updated',
        message: `Your subscription has been updated to ${tier} by admin.`,
        relatedModel: 'Subscription',
        relatedId: subscription._id,
      });

      const populatedSubscription = await Subscription.findById(subscription._id)
        .populate('user', 'name email');

      res.json(populatedSubscription);
    } catch (error) {
      console.error('Create subscription error:', error);
      res.status(500).json({ message: 'Failed to create subscription' });
    }
  },

  // Update subscription
  updateSubscription: async (req, res) => {
    try {
      const { id } = req.params;
      const { tier, status, amount, startDate, endDate } = req.body;

      const subscription = await Subscription.findById(id);
      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      // Update subscription
      const updatedSubscription = await Subscription.findByIdAndUpdate(
        id,
        {
          planName: tier,
          status,
          amount,
          startDate,
          endDate
        },
        { new: true }
      ).populate('user', 'name email');

      // Update user subscription status
      await User.findByIdAndUpdate(subscription.user, {
        subscriptionTier: tier,
        isPremium: tier !== 'free'
      });

      // Create notification
      await Notification.create({
        user: subscription.user,
        type: 'subscription',
        title: 'Subscription Updated',
        message: `Your subscription has been updated to ${tier} by admin.`,
        relatedModel: 'Subscription',
        relatedId: subscription._id,
      });

      res.json(updatedSubscription);
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({ message: 'Failed to update subscription' });
    }
  },

  // Delete subscription
  deleteSubscription: async (req, res) => {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findById(id);
      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      // Update user to free tier
      await User.findByIdAndUpdate(subscription.user, {
        subscriptionTier: 'free',
        isPremium: false
      });

      // Delete subscription
      await Subscription.findByIdAndDelete(id);

      // Create notification
      await Notification.create({
        user: subscription.user,
        type: 'subscription',
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled by admin.',
        relatedModel: 'User',
        relatedId: subscription.user,
      });

      res.json({ message: 'Subscription deleted successfully' });
    } catch (error) {
      console.error('Delete subscription error:', error);
      res.status(500).json({ message: 'Failed to delete subscription' });
    }
  },
  
  /* =========================
     ANNOUNCEMENTS
  ========================= */
  
  // Create announcement
  createAnnouncement: async (req, res) => {
    try {
      const { title, message, targetAudience, expiresAt } = req.body;
      
      console.log('📢 Creating announcement:', { title, targetAudience });
      
      const announcement = await Announcement.create({
        title,
        message,
        targetAudience: targetAudience || 'all',
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });
      
      // Create notifications for all users based on target audience
      let userQuery = { isDeleted: false };
      
      if (targetAudience === 'premium') {
        userQuery.isPremium = true;
      } else if (targetAudience === 'free') {
        userQuery.isPremium = false;
      }
      // If 'all', no additional filter needed
      
      const users = await User.find(userQuery).select('_id');
      console.log(`📧 Found ${users.length} users matching criteria:`, userQuery);
      
      // Create notification for each user
      const notifications = users.map(user => ({
        user: user._id,
        type: 'announcement',
        title: title,
        message: message,
        isRead: false,
      }));
      
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        console.log(`✅ Created ${notifications.length} notifications`);
      }
      
      res.status(201).json({
        announcement,
        notificationsSent: notifications.length,
      });
    } catch (error) {
      console.error('❌ Error creating announcement:', error);
      res.status(500).json({ message: error.message });
    }
  },
  
  // Get all announcements
  getAllAnnouncements: async (req, res) => {
    try {
      const announcements = await Announcement.find().sort({ createdAt: -1 });
      res.json(announcements);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  // Update announcement
  updateAnnouncement: async (req, res) => {
    try {
      const announcement = await Announcement.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      
      if (!announcement) {
        return res.status(404).json({ message: 'Announcement not found' });
      }
      
      res.json(announcement);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  // Delete announcement
  deleteAnnouncement: async (req, res) => {
    try {
      await Announcement.findByIdAndDelete(req.params.id);
      res.json({ message: 'Announcement deleted' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};


// ==================== CORRECTION REQUEST CONTROLLER ====================
exports.correctionController = {
    // Submit a correction request
    submitRequest: async (req, res) => {
        try {
            const { targetType, targetId, targetName, fields, proofDocuments } = req.body;
            
            console.log('📝 Submitting correction request:', {
                submittedBy: req.user.id,
                targetType,
                targetName,
                fieldsCount: fields?.length
            });
            
            const request = await CorrectionRequest.create({
                submittedBy: req.user.id,
                targetType,
                targetId,
                targetName,
                fields,
                proofDocuments: proofDocuments || [],
                status: 'pending',
            });
            
            console.log('✅ Request created:', request._id);
            
            // Notify admins
            const admins = await User.find({ role: 'admin' });
            console.log(`📢 Notifying ${admins.length} admins`);
            
            for (const admin of admins) {
                await Notification.create({
                    user: admin._id,
                    type: 'correction_status',
                    title: 'New Correction Request',
                    message: `${req.user.name} submitted a correction request for ${targetName}`,
                    relatedId: request._id,
                    relatedModel: 'CorrectionRequest',
                });
            }
            
            res.status(201).json({ message: 'Request submitted successfully', request });
        } catch (e) {
            console.error('❌ Error submitting correction request:', e);
            res.status(500).json({ message: e.message });
        }
    },
    
    // Get user's requests
    getMyRequests: async (req, res) => {
        try {
            const { status } = req.query;
            const filter = { submittedBy: req.user.id };
            if (status) filter.status = status;
            
            const requests = await CorrectionRequest.find(filter)
                .populate('reviewedBy', 'name')
                .sort({ createdAt: -1 });
            
            res.status(200).json({ requests });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Get request detail
    getRequestDetail: async (req, res) => {
        try {
            const request = await CorrectionRequest.findById(req.params.id)
                .populate('submittedBy', 'name email')
                .populate('reviewedBy', 'name');
            
            if (!request) {
                return res.status(404).json({ message: 'Request not found' });
            }
            
            // Check if user owns this request or is admin
            if (request.submittedBy._id.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Access denied' });
            }
            
            res.status(200).json({ request });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Update request (add more info)
    updateRequest: async (req, res) => {
        try {
            const { fields, proofDocuments } = req.body;
            const request = await CorrectionRequest.findById(req.params.id);
            
            if (!request) {
                return res.status(404).json({ message: 'Request not found' });
            }
            
            if (request.submittedBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Access denied' });
            }
            
            if (request.status !== 'pending' && request.status !== 'need_info') {
                return res.status(400).json({ message: 'Cannot update request in current status' });
            }
            
            if (fields) request.fields = fields;
            if (proofDocuments) request.proofDocuments = proofDocuments;
            request.status = 'pending';
            
            await request.save();
            
            res.status(200).json({ message: 'Request updated successfully', request });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Withdraw request
    withdrawRequest: async (req, res) => {
        try {
            const request = await CorrectionRequest.findById(req.params.id);
            
            if (!request) {
                return res.status(404).json({ message: 'Request not found' });
            }
            
            if (request.submittedBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Access denied' });
            }
            
            if (request.status === 'approved' || request.status === 'rejected') {
                return res.status(400).json({ message: 'Cannot withdraw request in current status' });
            }
            
            await CorrectionRequest.findByIdAndDelete(req.params.id);
            
            res.status(200).json({ message: 'Request withdrawn successfully' });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Admin: Get all requests
    getAllRequests: async (req, res) => {
        try {
            const { status, targetType } = req.query;
            const filter = {};
            if (status) filter.status = status;
            if (targetType) filter.targetType = targetType;
            
            console.log('🔍 Admin fetching correction requests with filter:', filter);
            
            const requests = await CorrectionRequest.find(filter)
                .populate('submittedBy', 'name email')
                .populate('reviewedBy', 'name')
                .sort({ createdAt: -1 });
            
            console.log(`📋 Found ${requests.length} correction requests`);
            
            res.status(200).json({ requests });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Admin: Review request
    reviewRequest: async (req, res) => {
        try {
            const { status, reviewNotes } = req.body;
            
            console.log('👨‍⚖️ Admin reviewing request:', req.params.id, 'Status:', status);
            
            const request = await CorrectionRequest.findById(req.params.id);
            
            if (!request) {
                console.log('❌ Request not found:', req.params.id);
                return res.status(404).json({ message: 'Request not found' });
            }
            
            request.status = status;
            request.reviewNotes = reviewNotes;
            request.reviewedBy = req.user.id;
            request.reviewedAt = new Date();
            
            await request.save();
            
            console.log('✅ Request updated to:', status);
            
            // Notify submitter
            await Notification.create({
                user: request.submittedBy,
                type: 'correction_status',
                title: `Request ${status}`,
                message: `Your correction request for ${request.targetName} has been ${status}`,
                relatedId: request._id,
                relatedModel: 'CorrectionRequest',
            });
            
            console.log('📢 User notified');
            
            // If approved, apply changes
            if (status === 'approved') {
                if (request.targetType === 'community' && request.targetId) {
                    const updateData = {};
                    request.fields.forEach(field => {
                        updateData[field.fieldName] = field.proposedValue;
                    });
                    await Community.findByIdAndUpdate(request.targetId, updateData);
                    console.log('✅ Changes applied to community:', request.targetId);
                }
                // Add similar logic for other target types
            }
            
            res.status(200).json({ message: 'Request reviewed successfully', request });
        } catch (e) {
            console.error('❌ Error reviewing request:', e);
            res.status(500).json({ message: e.message });
        }
    },
};

// ==================== ENHANCED COMMUNITY CONTROLLER ====================
exports.enhancedCommunityController = {
    // Get community detail with all sections
    getCommunityDetail: async (req, res) => {
        try {
            const community = await Community.findOne({
                _id: req.params.id,
                isDeleted: { $ne: true }
            }).populate('admin', 'name email');
            
            if (!community) {
                return res.status(404).json({ message: 'Community not found' });
            }
            
            // Get contributor count (users who added members to this community)
            const contributors = await TreeMember.distinct('addedBy', { 
                community: community._id,
                isDeleted: { $ne: true }
            });
            
            community.totalContributors = contributors.length;
            await community.save();
            
            res.status(200).json({ community });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Search communities with filters
    searchCommunities: async (req, res) => {
        try {
            const { search, state, district, gotra, kuldevi, sortBy } = req.query;
            const filter = { isDeleted: { $ne: true } };
            
            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { gotra: { $regex: search, $options: 'i' } },
                    { village: { $regex: search, $options: 'i' } },
                ];
            }
            
            if (state) filter.state = state;
            if (district) filter.district = district;
            if (gotra) filter.gotra = { $regex: gotra, $options: 'i' };
            if (kuldevi) filter.kuldevi = { $regex: kuldevi, $options: 'i' };
            
            let sort = { createdAt: -1 };
            if (sortBy === 'members') sort = { totalMembers: -1 };
            if (sortBy === 'name') sort = { name: 1 };
            
            const communities = await Community.find(filter)
                .populate('admin', 'name')
                .sort(sort)
                .limit(50);
            
            res.status(200).json({ communities });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Follow/Unfollow community
    toggleFollow: async (req, res) => {
        try {
            const community = await Community.findById(req.params.id);
            if (!community) {
                return res.status(404).json({ message: 'Community not found' });
            }
            
            const user = await User.findById(req.user.id);
            const isFollowing = user.community && user.community.toString() === community._id.toString();
            
            if (isFollowing) {
                user.community = null;
            } else {
                user.community = community._id;
            }
            
            await user.save();
            
            res.status(200).json({ 
                message: isFollowing ? 'Unfollowed community' : 'Following community',
                isFollowing: !isFollowing
            });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Suggest edit for community
    suggestEdit: async (req, res) => {
        try {
            const { fields, reason, proofDocuments } = req.body;
            const community = await Community.findById(req.params.id);
            
            if (!community) {
                return res.status(404).json({ message: 'Community not found' });
            }
            
            const request = await CorrectionRequest.create({
                submittedBy: req.user.id,
                targetType: 'community',
                targetId: community._id,
                targetName: community.name,
                fields,
                proofDocuments: proofDocuments || [],
                status: 'pending',
            });
            
            res.status(201).json({ message: 'Edit suggestion submitted', request });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
    
    // Get available filters (for filter dropdowns)
    getFilters: async (req, res) => {
        try {
            const states = await Community.distinct('state', { isDeleted: { $ne: true }, state: { $ne: null } });
            const districts = await Community.distinct('district', { isDeleted: { $ne: true }, district: { $ne: null } });
            const gotras = await Community.distinct('gotra', { isDeleted: { $ne: true }, gotra: { $ne: null } });
            const kuldevis = await Community.distinct('kuldevi', { isDeleted: { $ne: true }, kuldevi: { $ne: null } });
            
            res.status(200).json({
                filters: {
                    states: states.filter(Boolean).sort(),
                    districts: districts.filter(Boolean).sort(),
                    gotras: gotras.filter(Boolean).sort(),
                    kuldevis: kuldevis.filter(Boolean).sort(),
                }
            });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },
};
