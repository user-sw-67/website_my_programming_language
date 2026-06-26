/** Имя, которое видят остальные пользователи везде на сайте — у каждого
 * аккаунта есть уникальный логин (username, не показывается как подпись) и
 * необязательное отображаемое имя (display_name). Если отображаемое имя не
 * задано — везде на фронте подставляется логин, чтобы подпись не была пустой. */
export function displayName(user) {
  if (!user) return '';
  return user.display_name?.trim() || user.username || '';
}

export function avatarInitial(user) {
  const name = displayName(user);
  return name ? name.slice(0, 1).toUpperCase() : '?';
}

const LEVEL_LABEL = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };

/** Подпись для бейджа "разработчик" — конкретная роль/уровень вместо общего
 * "Developer": Junior/Middle/Senior для разработчиков языка, Admin для
 * администраторов (у них developer_level всегда null, см. User.save()). */
export function developerRoleLabel(user) {
  if (!user?.is_developer) return null;
  if (user.role === 'admin') return 'Admin';
  return LEVEL_LABEL[user.developer_level] || 'Developer';
}
