import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { getPasswordChecks, sanitizeProfileImageValue, validatePasswordChange } from '../../utils/passwordValidation';

const readStoredAdmin = () => {
  try { return JSON.parse(localStorage.getItem('admin') || '{}'); }
  catch { return {}; }
};

export default function useHrSettings() {
  const [admin, setAdmin] = useState(readStoredAdmin);

  const [displayName, setDisplayName] = useState(admin?.displayName || admin?.name || '');
  const [username, setUsername] = useState(admin?.username || admin?.userName || admin?.hrId || '');
  const [profileImage, setProfileImage] = useState(admin?.profileImage || admin?.photoURL || '');
  const [preview, setPreview] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [fieldErrors, setFieldErrors] = useState({});
  const [profileImageMeta, setProfileImageMeta] = useState(null);

  useEffect(() => {
    setDisplayName(admin?.displayName || admin?.name || '');
    setUsername(admin?.username || admin?.userName || admin?.hrId || '');
    setProfileImage(admin?.profileImage || admin?.photoURL || '');
    setPreview(admin?.profileImage || admin?.photoURL || '');
  }, [admin]);

  const resolvedPreviewImage = useMemo(
    () => sanitizeProfileImageValue(
      preview || (typeof profileImage === 'string' ? profileImage : '') || admin?.profileImage || admin?.photoURL || ''
    ),
    [admin?.photoURL, admin?.profileImage, preview, profileImage]
  );

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);

  const resetFormToStoredAdmin = useCallback(() => {
    setDisplayName(admin?.displayName || admin?.name || '');
    setUsername(admin?.username || admin?.userName || admin?.hrId || '');
    setProfileImage(admin?.profileImage || admin?.photoURL || '');
    setPreview(admin?.profileImage || admin?.photoURL || '');
    setCurrentPassword('');
    setPassword('');
    setConfirmPassword('');
    setFieldErrors({});
    setProfileImageMeta(null);
    setMessage('');
    setMessageType('info');
  }, [admin]);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    setProfileImage(file);
  }, []);

  const handleSave = useCallback(async () => {
    const nextFieldErrors = {};
    Object.assign(nextFieldErrors, validatePasswordChange(currentPassword, password, confirmPassword));
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setMessageType('error');
      setMessage('Please fix the highlighted fields before saving.');
      return;
    }

    setIsSaving(true);
    setMessage('');
    setMessageType('info');

    try {
      let userId = admin?.id || admin?.userId || admin?.uid || admin?.user_id || admin?.adminId || admin?.hrId || admin?.employeeId;
      if (!userId) {
        try {
          const lookup = await api.get('/users/lookup', {
            params: { username: admin?.username || admin?.userName || '', email: admin?.email || '' },
          });
          const match = lookup.data || {};
          if (match) userId = match.id || match.uid || match.userId;
        } catch (error) {
          console.warn('targeted user lookup failed', error);
        }
      }

      let profileUrl = preview || '';

      if (profileImage && typeof profileImage !== 'string' && userId) {
        const form = new FormData();
        form.append('profile', profileImage);
        const uploadResponse = await api.post(`/users/${userId}/upload_profile_image`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        profileUrl = uploadResponse.data?.profileImageUrl || profileUrl;
      }

      let warningRaised = false;
      if (userId) {
        const payload = {};
        if (profileUrl) payload.profileImage = profileUrl;
        if (password) {
          payload.password = password;
          payload.oldPassword = currentPassword;
        }
        await api.put(`/users/${userId}`, payload);
      } else {
        warningRaised = true;
        setMessageType('warning');
        setMessage('Profile saved locally but backend user id could not be resolved. Please sign in again.');
      }

      const updated = { ...(admin || {}) };
      updated.profileImage = profileUrl || updated.profileImage;
      localStorage.setItem('admin', JSON.stringify(updated));
      window.dispatchEvent(new Event('hr-admin-updated'));
      setAdmin(updated);
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setFieldErrors({});

      if (!warningRaised) {
        setMessageType('success');
        setMessage('Profile updated successfully.');
      }
    } catch (error) {
      console.error('HRSettings save error:', error);
      const responseData = error?.response?.data;
      if (responseData && typeof responseData === 'object') {
        const msgParts = [];
        if (responseData.error) msgParts.push(responseData.error);
        if (responseData.hint) msgParts.push(responseData.hint);
        if (responseData.trace) console.debug('Backend trace:', responseData.trace);
        setMessageType('error');
        setMessage(msgParts.join(' - ') || JSON.stringify(responseData));
      } else {
        setMessageType('error');
        setMessage(error?.response?.statusText || error?.message || 'Failed to update profile');
      }
    } finally {
      setIsSaving(false);
    }
  }, [admin, confirmPassword, currentPassword, password, preview, profileImage]);

  return {
    admin,
    displayName,
    username,
    profileImage,
    preview,
    resolvedPreviewImage,
    profileImageMeta,
    isOptimizingImage,
    setIsOptimizingImage,
    currentPassword,
    password,
    confirmPassword,
    fieldErrors,
    setFieldErrors,
    setCurrentPassword,
    setPassword,
    setConfirmPassword,
    passwordChecks,
    isSaving,
    message,
    messageType,
    handleFileChange,
    handleSave,
    resetFormToStoredAdmin,
  };
}
