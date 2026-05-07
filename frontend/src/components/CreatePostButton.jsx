import { useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext';
import './CreatePostButton.css';

function CreatePostButton() {
    const navigate = useNavigate();
    const { t } = useLang();

    return (
        <button
            className="create-post-btn"
            onClick={() => navigate('/create-post')}
        >
            {t('createPostBtn')}
        </button>
    );
}

export default CreatePostButton;
