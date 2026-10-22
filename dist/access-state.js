'use strict';

const AccessState = (() => {
  const databaseName = 'uchi-control-demo-v1';
  const price = 15;
  let database;
  let snapshot;
  const clone = value => JSON.parse(JSON.stringify(value));
  const identifier = () => crypto.randomUUID();
  function initial(progress = emptyState()) {
    const started = progress.current > 0 || progress.attempts.some(Boolean);
    return {version:1, balance:started ? 5 : 20, eggs:completedResult(progress) ? 2 : 0,
      entitlement:null, purchase:null, starts:{}, attempt:started ? {
        id:identifier(), revision:0, progress, rewarded:!!completedResult(progress), charged:15
      } : null};
  }
  function validate(account) {
    if (!account || account.version !== 1 || !Number.isSafeInteger(account.balance) || account.balance < 0 ||
      !Number.isSafeInteger(account.eggs) || account.eggs < 0 || !account.starts || typeof account.starts !== 'object' ||
      (account.entitlement !== null && !Number.isFinite(account.entitlement)) ||
      (account.attempt && (!account.attempt.id || !Number.isSafeInteger(account.attempt.revision) || !validProgress(account.attempt.progress)))) {
      throw new Error('Сохранение повреждено. Открой настройки демо для сброса.');
    }
    return account;
  }
  function fullAccess(account) { return account.entitlement > Date.now(); }
  function begin(account, requestId, previous) {
    if (requestId && Object.hasOwn(account.starts, requestId)) {
      if (account.starts[requestId] !== account.attempt?.id) throw new Error('Эта попытка уже заменена новой. Вернись к контрольным работам.');
      return account;
    }
    if (!requestId && account.attempt) return account;
    if (requestId && previous !== (account.attempt?.id || 'none')) throw new Error('Попытка изменилась в другой вкладке. Вернись к контрольным работам.');
    if (!fullAccess(account) && account.balance < price) {
      const error = new Error('Недостаточно бусин'); error.code = 'BALANCE'; throw error;
    }
    const charged = fullAccess(account) ? 0 : price;
    account.balance -= charged;
    account.attempt = {id:identifier(), revision:0, progress:emptyState(), rewarded:false, charged};
    if (requestId) account.starts[requestId] = account.attempt.id;
    return account;
  }
  function updateProgress(account, id, revision, progress) {
    if (account.attempt?.id !== id || account.attempt.revision !== revision) throw new Error('Работа изменилась в другой вкладке. Обнови страницу, чтобы продолжить.');
    if (!validProgress(progress)) throw new Error('Не удалось сохранить ответы. Обнови страницу.');
    account.attempt.progress = clone(progress);
    account.attempt.revision++;
    if (completedResult(progress) && !account.attempt.rewarded) {
      account.eggs += 2;
      account.attempt.rewarded = true;
    }
    return account;
  }
  function purchase(account, orderId) {
    if (!orderId) throw new Error('Не найден демо-заказ. Вернись к выбору тарифа.');
    if (fullAccess(account) || account.purchase?.id === orderId) return account;
    const until = new Date(); until.setFullYear(until.getFullYear() + 1);
    account.entitlement = until.getTime();
    account.purchase = {id:orderId, amount:1500, demo:true};
    return account;
  }
  function transaction(change) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('account', 'readwrite');
      const storage = transaction.objectStore('account');
      let result;
      let failure;
      const request = storage.get('student');
      request.onsuccess = () => {
        try {
          const account = request.result === undefined ? initial(loadState()) : validate(request.result);
          result = change(account);
          storage.put(result, 'student');
        } catch (error) { failure = error; transaction.abort(); }
      };
      transaction.oncomplete = () => { snapshot = clone(result); resolve(clone(result)); };
      transaction.onabort = transaction.onerror = () => reject(failure || new Error('Не удалось сохранить прогресс. Разреши хранение данных в браузере и попробуй снова.'));
    });
  }
  async function open() {
    if (!database) database = await new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('account');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Браузер не разрешил сохранение. Разреши хранение данных и обнови страницу.'));
      request.onblocked = () => reject(new Error('Закрой другие вкладки прототипа и обнови страницу.'));
    });
    return transaction(account => account);
  }
  function restartUrl() {
    return `index.html?start=${identifier()}&previous=${encodeURIComponent(snapshot?.attempt?.id || 'none')}`;
  }
  async function reset(balance = 20) {
    if (![0,5,14,15,20].includes(balance)) throw new Error('Недопустимый баланс демо.');
    localStorage.removeItem(STORAGE_KEY);
    const transaction = database.transaction('account', 'readwrite');
    const account = initial(); account.balance = balance;
    transaction.objectStore('account').put(account, 'student');
    await new Promise((resolve,reject) => { transaction.oncomplete = resolve; transaction.onerror = transaction.onabort = reject; });
    snapshot = account;
    return clone(account);
  }
  return {open, get:() => snapshot ? clone(snapshot) : null, fullAccess, restartUrl, reset,
    start:(requestId, previous) => transaction(account => begin(account, requestId, previous)),
    save:(id, revision, progress) => transaction(account => updateProgress(account, id, revision, progress)),
    buy:orderId => transaction(account => purchase(account, orderId)),
    model:{initial, validate, begin, updateProgress, purchase}};
})();
