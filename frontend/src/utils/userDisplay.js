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
