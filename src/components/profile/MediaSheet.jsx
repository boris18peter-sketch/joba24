import ProfileSheet from './ProfileSheet';
import ProfileMediaGallery from '@/components/ProfileMediaGallery';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * MediaSheet — the personal gallery (intro video + media), unchanged in
 * behaviour, simply moved off the main Profile page.
 */
export default function MediaSheet({ me, onClose }) {
  const { t } = useLanguage();

  const media = [
    ...(me?.intro_video_url ? [{ type: 'video', url: me.intro_video_url }] : []),
    ...(me?.profile_media || []),
  ];

  return (
    <ProfileSheet title={t('pr_media_gallery')} onClose={onClose}>
      {media.length === 0 ? (
        <div style={{ padding: '26px 0', textAlign: 'center', fontSize: 14, color: 'var(--text-3)' }}>
          {t('pr_media_empty')}
        </div>
      ) : (
        <div style={{ paddingBottom: 8 }}>
          <ProfileMediaGallery media={media} isEditing={false} />
        </div>
      )}
    </ProfileSheet>
  );
}