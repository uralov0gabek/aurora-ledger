import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import toast from 'react-hot-toast';
import { User, Mail, Lock, Save, Eye, EyeOff, Shield, Trash2, AlertTriangle } from 'lucide-react';

const Profile = () => {
  const { user, setUser, logout } = useAuth();
  const { t } = useTranslation();
  const API_URL = import.meta.env.VITE_API_URL;

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: ''
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Show password toggles
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Loading states
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    // Fetch full profile data from backend
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/profile`);
        setProfileData(response.data);
        
        // Update user in context with created_at
        const updatedUser = { ...user, created_at: response.data.created_at };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || ''
      });
      fetchProfile();
    }
  }, [user?.id]); // Only re-run if user ID changes

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      const response = await axios.put(`${API_URL}/profile`, profileForm);
      
      // Update user in context and localStorage
      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success(t('profile.updateSuccess') || 'Profile updated successfully!');
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || t('profile.updateError') || 'Failed to update profile';
      toast.error(message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('profile.passwordMismatch') || 'Passwords do not match');
      return;
    }

    // Validate password length
    if (passwordForm.newPassword.length < 6) {
      toast.error(t('profile.passwordTooShort') || 'Password must be at least 6 characters');
      return;
    }

    // Check if user is OAuth user (Google login)
    const isOAuthUser = user?.oauth_provider && user.oauth_provider !== 'local';

    // Only require current password for non-OAuth users
    if (!isOAuthUser && !passwordForm.currentPassword) {
      toast.error(t('profile.currentPasswordRequired') || 'Current password is required');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await axios.put(`${API_URL}/profile/change-password`, passwordForm);
      
      const message = response.data.message + (response.data.note ? '\n' + response.data.note : '');
      toast.success(message);
      
      // Reset password form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // If OAuth user just set password, update user context
      if (isOAuthUser) {
        const updatedUser = { ...user, oauth_provider: 'local' };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || t('profile.passwordChangeError') || 'Failed to change password';
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/profile`);
      toast.success(t('profile.accountDeleted') || 'Account deleted successfully!');
      logout();
    } catch (error) {
      const message = error.response?.data?.error || t('common.error') || 'Failed to delete account';
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            {t('profile.title') || 'Profile Settings'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('profile.subtitle') || 'Manage your account settings and preferences'}
          </p>
        </div>

        {/* Admin/Mod Button - Only visible to admin and mod users */}
        {(user?.role === 'admin' || user?.role === 'mod') && (
          <Link 
            to="/admin"
            className={`flex items-center gap-2 px-4 py-2.5 ${
              user?.role === 'admin' 
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600'
            } text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl`}
          >
            <Shield size={20} />
            <span>{user?.role === 'admin' ? 'Admin Dashboard' : 'Moderator Panel'}</span>
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Profile Information Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <User className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('profile.personalInfo') || 'Personal Information'}
            </h2>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.fullName') || 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder={t('profile.fullNamePlaceholder') || 'Enter your full name'}
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.email') || 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder={t('profile.emailPlaceholder') || 'Enter your email'}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {isUpdatingProfile ? (t('profile.updating') || 'Updating...') : (t('profile.updateProfile') || 'Update Profile')}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Lock className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('profile.changePassword') || 'Change Password'}
            </h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Show info for OAuth users */}
            {user?.oauth_provider && user.oauth_provider !== 'local' && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  ℹ️ {t('profile.oauthPasswordInfo') || 'You logged in with Google. You can set a password below to also login with email.'}
                </p>
              </div>
            )}

            {/* Only show current password field for non-OAuth users who have a password */}
            {(!user?.oauth_provider || user.oauth_provider === 'local') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.currentPassword') || 'Current Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* New Password field - available for everyone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.newPassword') || 'New Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder={user?.oauth_provider && user.oauth_provider !== 'local' 
                    ? (t('profile.setPasswordPlaceholder') || 'Set your password') 
                    : '••••••••'
                  }
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('profile.passwordRequirement') || 'At least 6 characters'}
              </p>
            </div>

            {/* Confirm Password field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.confirmPassword') || 'Confirm New Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock size={18} />
              {isChangingPassword ? (t('profile.changing') || 'Changing...') : (t('profile.changePasswordBtn') || 'Change Password')}
            </button>
          </form>
        </div>
      </div>

      {/* Account Information */}
      <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('profile.accountInfo') || 'Account Information'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">
              {t('profile.accountCreated') || 'Account Created:'}
            </span>
            <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium">
              {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString() : 'Loading...'}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">
              {t('profile.userId') || 'User ID:'}
            </span>
            <span className="ml-2 text-gray-900 dark:text-gray-100 font-mono">
              #{user?.id || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-red-200 dark:border-red-900/50 p-6">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-500 mb-2 flex items-center gap-2">
          <AlertTriangle size={20} />
          Danger Zone
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          {t('profile.deleteAccountDesc') || 'Permanently delete your account and all associated data'}
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Trash2 size={18} />
          {t('profile.deleteAccount') || 'Delete Account'}
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 text-red-600 dark:text-red-500">
                <AlertTriangle size={24} />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {t('profile.deleteConfirmTitle') || 'Delete Account'}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('profile.deleteConfirmMessage') || 'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.'}
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('profile.deletingAccount') || 'Deleting...'}
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      {t('common.delete') || 'Delete'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
