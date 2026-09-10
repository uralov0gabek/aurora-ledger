import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import Layout from '../components/Layout';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Users, Plus, Mail, Shield, Trash2, Settings,
  UserPlus, X, Check, Crown, UserCheck, Eye, AlertTriangle,
  Copy, Link as LinkIcon, Ticket, DollarSign, Target
} from 'lucide-react';
import { clearAuthAndReload } from '../utils/debugAuth';

export default function Family() {
  const { t } = useTranslation();
  const { currency, formatCurrency } = useCurrency();
  
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [familyDetails, setFamilyDetails] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [inviteCodes, setInviteCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showGenerateCodeModal, setShowGenerateCodeModal] = useState(false);
  const [showJoinFamilyModal, setShowJoinFamilyModal] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState('members'); // members, budgets, goals
  const [sharedBudgets, setSharedBudgets] = useState([]);
  const [sharedGoals, setSharedGoals] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setAuthError(false);
    try {
      const [familiesRes, invitationsRes] = await Promise.all([
        api.get('/families'),
        api.get('/families/invitations/pending')
      ]);
      setFamilies(familiesRes.data.families);
      setInvitations(invitationsRes.data.invitations);
      
      if (familiesRes.data.families.length > 0 && !selectedFamily) {
        selectFamily(familiesRes.data.families[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      
      if (error.response?.status === 403 || error.response?.status === 401) {
        setAuthError(true);
        toast.error('Authentication error. Please log in again.');
      } else {
        toast.error(t('family.failedToLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  const selectFamily = async (familyId) => {
    try {
      // First, get family details to know user's role
      const detailsRes = await api.get(`/families/${familyId}`);
      setFamilyDetails(detailsRes.data);
      setSelectedFamily(familyId);
      
      // Fetch shared data
      await fetchSharedData(familyId);
      
      // Only fetch invite codes if user is head or manager
      const userRole = detailsRes.data.currentUserRole;
      if (userRole === 'head' || userRole === 'manager') {
        try {
          const codesRes = await api.get(`/families/${familyId}/invite-codes`);
          setInviteCodes(codesRes.data.inviteCodes || []);
        } catch (error) {
          console.error('Error fetching invite codes:', error);
          // Don't show error for invite codes, just set empty array
          setInviteCodes([]);
        }
      } else {
        // Contributors and observers don't see invite codes
        setInviteCodes([]);
      }
    } catch (error) {
      console.error('Error fetching family details:', error);
      const errorMsg = error.response?.data?.error || 'Failed to load family details';
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        toast.error(t('family.accessDenied') || 'Access denied. You may not have permission to view this family.');
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const fetchSharedData = async (familyId) => {
    try {
      const [budgetsRes, goalsRes] = await Promise.all([
        api.get(`/family/${familyId}/budgets?currency=${currency}`),
        api.get(`/family/${familyId}/goals?currency=${currency}`)
      ]);
      setSharedBudgets(budgetsRes.data.budgets || []);
      setSharedGoals(goalsRes.data.goals || []);
    } catch (error) {
      console.error('Error fetching shared data:', error);
      setSharedBudgets([]);
      setSharedGoals([]);
    }
  };

  const handleCreateFamily = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      await api.post('/families', {
        name: formData.get('name'),
        description: formData.get('description')
      });
      toast.success(t('family.familyCreated'));
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating family:', error);
      toast.error(error.response?.data?.error || t('family.failedToCreate'));
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      await api.post(`/families/${selectedFamily}/invite`, {
        email: formData.get('email'),
        role: formData.get('role')
      });
      toast.success(t('family.inviteSent'));
      setShowInviteModal(false);
      selectFamily(selectedFamily);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error(error.response?.data?.error || t('family.failedToInvite'));
    }
  };

  const handleInvitationResponse = async (familyId, action) => {
    try {
      await api.post(`/families/${familyId}/invitation/${action}`);
      toast.success(action === 'accept' ? t('family.inviteAccepted') : t('family.inviteDeclined'));
      fetchData();
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      toast.error(t('family.failedToLoad'));
    }
  };

  const handleDeleteFamily = async () => {
    if (!confirm(t('family.deleteConfirm'))) {
      return;
    }
    
    try {
      await api.delete(`/families/${selectedFamily}`);
      toast.success(t('family.familyDeleted'));
      setSelectedFamily(null);
      setFamilyDetails(null);
      fetchData(); // Reload families list
    } catch (error) {
      console.error('Error deleting family:', error);
      toast.error(error.response?.data?.error || t('family.failedToDelete'));
    }
  };

  const handleRemoveMember = async (memberId, isSelf = false) => {
    const confirmMessage = isSelf 
      ? t('family.leaveConfirm')
      : t('family.removeConfirm');
      
    if (!confirm(confirmMessage)) return;
    
    try {
      const response = await api.delete(`/families/${selectedFamily}/members/${memberId}`);
      
      if (response.data.self) {
        toast.success(t('family.leftFamily'));
        fetchData(); // Reload families list
      } else {
        toast.success(t('family.memberRemoved'));
        selectFamily(selectedFamily);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(error.response?.data?.error || t('family.failedToRemove'));
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    // Confirm head transfer
    if (newRole === 'head') {
      if (!confirm(t('family.transferHeadConfirm'))) {
        return;
      }
    }

    try {
      const response = await api.put(`/families/${selectedFamily}/members/${memberId}/role`, {
        role: newRole
      });
      
      if (response.data.transferred) {
        toast.success(t('family.headTransferred'));
      } else {
        toast.success(t('family.roleUpdated'));
      }
      
      selectFamily(selectedFamily);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error.response?.data?.error || t('family.failedToUpdateRole'));
    }
  };

  const handleGenerateInviteCode = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Validate selectedFamily exists
    if (!selectedFamily) {
      toast.error('Please select a family first');
      return;
    }
    
    console.log('Generating invite code for family:', selectedFamily);
    
    // Convert to int, treat 0 or empty as null (unlimited)
    const maxUses = formData.get('max_uses');
    const expiresInDays = formData.get('expires_in_days');
    const role = formData.get('role') || 'contributor';
    
    const maxUsesValue = maxUses && parseInt(maxUses) > 0 ? parseInt(maxUses) : null;
    const expiresValue = expiresInDays && parseInt(expiresInDays) > 0 ? parseInt(expiresInDays) : null;
    
    try {
      await api.post(`/families/${selectedFamily}/invite-codes`, {
        max_uses: maxUsesValue,
        expires_in_days: expiresValue,
        role: role
      });
      
      const message = maxUsesValue || expiresValue 
        ? t('family.inviteCode.codeGenerated')
        : `Unlimited invite code created! ♾️ (Role: ${t(`family.roles.${role}`)})`;
      toast.success(message);
      
      setShowGenerateCodeModal(false);
      selectFamily(selectedFamily);
    } catch (error) {
      console.error('Error generating invite code:', error);
      toast.error(error.response?.data?.error || t('family.inviteCode.failedToGenerate'));
    }
  };

  const handleDeactivateCode = async (codeId) => {
    if (!confirm('Are you sure you want to deactivate this invite code?')) {
      return;
    }
    
    try {
      await api.delete(`/families/${selectedFamily}/invite-codes/${codeId}`);
      toast.success(t('family.inviteCode.codeDeactivated'));
      selectFamily(selectedFamily);
    } catch (error) {
      console.error('Error deactivating code:', error);
      toast.error(error.response?.data?.error || t('family.inviteCode.failedToDeactivate'));
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(t('family.inviteCode.copied'));
  };

  const handleCopyLink = (code) => {
    const link = `${window.location.origin}/join-family?code=${code}`;
    navigator.clipboard.writeText(link);
    toast.success(t('family.inviteCode.copied'));
  };

  const handleJoinFamily = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const code = formData.get('code').trim();
    
    if (!code) {
      toast.error('Please enter an invite code');
      return;
    }
    
    try {
      const response = await api.post('/families/join', { code });
      toast.success(response.data.message || t('family.inviteCode.joinSuccess'));
      setShowJoinFamilyModal(false);
      fetchData();
    } catch (error) {
      console.error('Error joining family:', error);
      const errorMsg = error.response?.data?.error || t('family.inviteCode.failedToJoin');
      
      // More specific error messages
      if (error.response?.status === 404) {
        toast.error('Invalid or expired invite code. Please check the code and try again.');
      } else if (error.response?.status === 400) {
        toast.error(errorMsg); // Show specific error from backend (already member, max uses, etc.)
      } else if (error.response?.status === 403 || error.response?.status === 401) {
        toast.error('Authentication error. Please log in again.');
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'head': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'manager': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'contributor': return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'observer': return <Eye className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'head': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'contributor': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'observer': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Auth Error Banner */}
        {authError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-100">
                    Authentication Error
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Your session may have expired. Please log in again.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={clearAuthAndReload}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Re-login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('family.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('family.subtitle')}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinFamilyModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              {t('family.inviteCode.joinFamily')}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              {t('family.createFamily')}
            </button>
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                {t('family.invitations')} ({invitations.length})
              </h3>
            </div>
            <div className="space-y-2">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {invite.family_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('family.createdBy')} {invite.invited_by_name} - {t(`family.roles.${invite.role}`)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInvitationResponse(invite.family_id, 'accept')}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      title={t('family.accept')}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleInvitationResponse(invite.family_id, 'decline')}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      title={t('family.decline')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {families.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('family.noFamilies')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('family.noFamiliesDesc')}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('family.createFirstFamily')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Family List */}
            <div className="lg:col-span-1 space-y-3">
              {families.map((family) => (
                <button
                  key={family.id}
                  onClick={() => selectFamily(family.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedFamily === family.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {family.name}
                      </h3>
                      {family.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {family.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className={`px-2 py-1 rounded-full ${getRoleBadgeColor(family.role)}`}>
                          {t(`family.roles.${family.role}`)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {family.member_count} {t('family.members')}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Family Details */}
            {familyDetails && (
              <div className="lg:col-span-2 space-y-6">
                {/* Family Info Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {familyDetails.family.name}
                      </h2>
                      {familyDetails.family.description && (
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                          {familyDetails.family.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {t('family.createdBy')} {familyDetails.family.created_by_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {['head', 'manager'].includes(familyDetails.currentUserRole) && (
                        <>
                          <button
                            onClick={() => setShowInviteModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Mail className="h-4 w-4" />
                            {t('family.inviteMember')}
                          </button>
                          <button
                            onClick={() => setShowGenerateCodeModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                          >
                            <Ticket className="h-4 w-4" />
                            {t('family.inviteCode.generate')}
                          </button>
                        </>
                      )}
                      {familyDetails.currentUserRole === 'head' && (
                        <button
                          onClick={handleDeleteFamily}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          title={t('family.deleteFamily')}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('family.deleteFamily')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex -mb-px">
                      <button
                        onClick={() => setActiveTab('members')}
                        className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'members'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{t('family.members')}</span>
                          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700">
                            {familyDetails.members.length}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveTab('budgets')}
                        className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'budgets'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span>Ngân sách chung</span>
                          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700">
                            {sharedBudgets.length}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveTab('goals')}
                        className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'goals'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          <span>Mục tiêu chung</span>
                          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700">
                            {sharedGoals.length}
                          </span>
                        </div>
                      </button>
                    </nav>
                  </div>

                  <div className="p-6">
                    {/* Members Tab Content */}
                    {activeTab === 'members' && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          {t('family.members')} ({familyDetails.members.length})
                        </h3>
                  <div className="space-y-3">
                    {familyDetails.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                              {member.full_name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {member.full_name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {member.email}
                            </p>
                            {member.status === 'pending' && (
                              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                {t('family.inviteCode.pendingInvitation')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Role hierarchy: head(4) > manager(3) > contributor(2) > observer(1) */}
                          {(() => {
                            const roleHierarchy = { 'head': 4, 'manager': 3, 'contributor': 2, 'observer': 1 };
                            const currentLevel = roleHierarchy[familyDetails.currentUserRole];
                            const memberLevel = roleHierarchy[member.role];
                            const canModify = currentLevel > memberLevel;

                            // Show role badge (read-only)
                            if (!canModify) {
                              return (
                                <span className={`px-3 py-1 rounded-full flex items-center gap-1 ${getRoleBadgeColor(member.role)}`}>
                                  {getRoleIcon(member.role)}
                                  {t(`family.roles.${member.role}`)}
                                </span>
                              );
                            }

                            // Show role selector (can modify)
                            return (
                              <select
                                value={member.role}
                                onChange={(e) => handleChangeRole(member.id, e.target.value)}
                                className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              >
                                {familyDetails.currentUserRole === 'head' && (
                                  <option value="head">{t('family.roles.head')} - {t('family.inviteCode.roleTransferDescription')}</option>
                                )}
                                <option value="manager">{t('family.roles.manager')} - {t('family.inviteCode.managerRoleDescription')}</option>
                                <option value="contributor">{t('family.roles.contributor')} - {t('family.inviteCode.contributorRoleDescription')}</option>
                                <option value="observer">{t('family.roles.observer')} - {t('family.inviteCode.observerRoleDescription')}</option>
                              </select>
                            );
                          })()}
                          
                          {/* Remove/Leave button */}
                          {(() => {
                            const roleHierarchy = { 'head': 4, 'manager': 3, 'contributor': 2, 'observer': 1 };
                            const currentLevel = roleHierarchy[familyDetails.currentUserRole];
                            const memberLevel = roleHierarchy[member.role];
                            const isSelf = member.user_id === familyDetails.currentUserId;
                            
                            // Self: Show Leave button (except head)
                            if (isSelf && member.role !== 'head') {
              return (
                                <button
                                  onClick={() => handleRemoveMember(member.id, true)}
                                  className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                                >
                                  {t('family.leaveFamily')}
                                </button>
                              );
                            }
                            
                            // Others: Show Remove button only if can modify
                            if (!isSelf && currentLevel > memberLevel) {
                              return (
                                <button
                                  onClick={() => handleRemoveMember(member.id, false)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              );
                            }
                            
                            return null;
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>

                {/* Invite Codes Section */}
                {['head', 'manager'].includes(familyDetails.currentUserRole) && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {t('family.inviteCode.title')}
                    </h3>
                    {inviteCodes.length === 0 ? (
                      <div className="text-center py-8">
                        <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {t('family.inviteCode.noActiveCodes')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          {t('family.inviteCode.createFirst')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {inviteCodes.map((code) => (
                          <div
                            key={code.id}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <code className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded font-mono text-lg font-semibold">
                                  {code.code}
                                </code>
                                {code.is_active ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded text-xs font-semibold">
                                    Active
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 rounded text-xs">
                                    Inactive
                                  </span>
                                )}
                                {code.role && (
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getRoleBadgeColor(code.role)}`}>
                                    {getRoleIcon(code.role)}
                                    {t(`family.roles.${code.role}`)}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                <p>
                                  {t('family.inviteCode.createdBy')}: {code.created_by_name}
                                </p>
                                <div className="flex gap-4">
                                  {code.max_uses ? (
                                    <span>
                                      {t('family.inviteCode.usesCount')}: {code.uses_count || 0}/{code.max_uses}
                                    </span>
                                  ) : (
                                    <span>
                                      {t('family.inviteCode.usesCount')}: {code.uses_count || 0} ({t('family.inviteCode.unlimited')})
                                    </span>
                                  )}
                                  {code.expires_at && (
                                    <span>
                                      {t('family.inviteCode.expiresAt')}: {new Date(code.expires_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCopyCode(code.code)}
                                className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                                title={t('family.inviteCode.copyCode')}
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleCopyLink(code.code)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                title={t('family.inviteCode.copyLink')}
                              >
                                <LinkIcon className="h-4 w-4" />
                              </button>
                              {code.is_active && (
                                <button
                                  onClick={() => handleDeactivateCode(code.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                  title={t('family.inviteCode.deactivate')}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                      </div>
                    )}

                    {/* Budgets Tab Content */}
                    {activeTab === 'budgets' && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Ngân sách chung ({sharedBudgets.length})
                          </h3>
                          {['head', 'manager', 'contributor'].includes(familyDetails.currentUserRole) && (
                            <button
                              onClick={() => toast.info('Chức năng đang phát triển')}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              <Plus className="h-4 w-4" />
                              Tạo ngân sách
                            </button>
                          )}
                        </div>
                        {sharedBudgets.length === 0 ? (
                          <div className="text-center py-12">
                            <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                              Chưa có ngân sách chung
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              Tạo ngân sách để quản lý chi tiêu chung
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {sharedBudgets.map((budget) => (
                              <div key={budget.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white">{budget.name}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {budget.category_name || 'Không danh mục'}
                                    </p>
                                    <div className="mt-3">
                                      <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-gray-600 dark:text-gray-400">Đã dùng</span>
                                        <span className="font-semibold">
                                          {formatCurrency(budget.spent || 0)} / {formatCurrency(budget.amount)}
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div
                                          className="bg-blue-600 h-2 rounded-full"
                                          style={{ width: `${Math.min((budget.spent / budget.amount) * 100, 100)}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Goals Tab Content */}
                    {activeTab === 'goals' && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Mục tiêu chung ({sharedGoals.length})
                          </h3>
                          {['head', 'manager', 'contributor'].includes(familyDetails.currentUserRole) && (
                            <button
                              onClick={() => toast.info('Chức năng đang phát triển')}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              <Plus className="h-4 w-4" />
                              Tạo mục tiêu
                            </button>
                          )}
                        </div>
                        {sharedGoals.length === 0 ? (
                          <div className="text-center py-12">
                            <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                              Chưa có mục tiêu chung
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              Tạo mục tiêu để tiết kiệm cùng nhau
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {sharedGoals.map((goal) => (
                              <div key={goal.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl">{goal.icon || '🎯'}</span>
                                      <h4 className="font-semibold text-gray-900 dark:text-white">{goal.name}</h4>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {goal.category || 'Không danh mục'}
                                    </p>
                                    <div className="mt-3">
                                      <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-gray-600 dark:text-gray-400">Tiến độ</span>
                                        <span className="font-semibold">
                                          {formatCurrency(goal.current_amount || 0)} / {formatCurrency(goal.target_amount)}
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div
                                          className="bg-green-600 h-2 rounded-full"
                                          style={{ width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                    {goal.deadline && (
                                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                        Deadline: {new Date(goal.deadline).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => toast.info('Chức năng đóng góp đang phát triển')}
                                    className="ml-4 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Đóng góp
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Create Family Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('family.createFamily')}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateFamily} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('family.familyName')} *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Smith Family"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('family.familyDescription')}
                </label>
                <textarea
                  name="description"
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Our family budget group"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('family.inviteMember')}
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('family.inviteEmail')} *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="member@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('family.inviteRole')} *
                </label>
                <select
                  name="role"
                  defaultValue="contributor"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="manager">{t('family.roles.manager')} - {t('family.roleDescriptions.manager')}</option>
                  <option value="contributor">{t('family.roles.contributor')} - {t('family.roleDescriptions.contributor')}</option>
                  <option value="observer">{t('family.roles.observer')} - {t('family.roleDescriptions.observer')}</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('family.sendInvite')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Invite Code Modal */}
      {showGenerateCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('family.inviteCode.generate')}
              </h3>
              <button
                onClick={() => setShowGenerateCodeModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleGenerateInviteCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('family.inviteRole')} *
                </label>
                <select
                  name="role"
                  defaultValue="contributor"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="manager">{t('family.roles.manager')} - {t('family.inviteCode.managerRoleDescription') || 'Can manage budgets & members'}</option>
                  <option value="contributor">{t('family.roles.contributor')} - {t('family.inviteCode.contributorRoleDescription') || 'Can add transactions'}</option>
                  <option value="observer">{t('family.roles.observer')} - {t('family.inviteCode.observerRoleDescription') || 'View only'}</option>
                </select>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  👥 All users joining via this link will get this role
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('family.inviteCode.maxUses')}
                </label>
                <input
                  type="number"
                  name="max_uses"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0 = Unlimited"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  💡 Leave empty or enter 0 for unlimited uses
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('family.inviteCode.expiresIn')} ({t('family.inviteCode.days')})
                </label>
                <input
                  type="number"
                  name="expires_in_days"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0 = Never expires"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  💡 Leave empty or enter 0 for permanent link
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateCodeModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {t('family.inviteCode.generate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Family Modal */}
      {showJoinFamilyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('family.inviteCode.joinFamily')}
              </h3>
              <button
                onClick={() => setShowJoinFamilyModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleJoinFamily} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('family.inviteCode.enterCode')} *
                </label>
                <input
                  type="text"
                  name="code"
                  required
                  maxLength="8"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-lg tracking-wider uppercase"
                  placeholder={t('family.inviteCode.codePlaceholder')}
                  style={{ textTransform: 'uppercase' }}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {t('family.inviteCode.shareTitle')}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoinFamilyModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {t('family.inviteCode.join')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
