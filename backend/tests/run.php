<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Ensure working directory is backend
chdir(dirname(__DIR__));

putenv('APP_ENV=testing');
putenv('DB_CONNECTION=mysql');
putenv('DB_HOST=127.0.0.1');
putenv('DB_PORT=3307');
putenv('DB_DATABASE=praktika_p2_testing');
putenv('DB_USERNAME=root');
putenv('DB_PASSWORD=');
putenv('CACHE_STORE=array');
putenv('SESSION_DRIVER=array');
putenv('QUEUE_CONNECTION=sync');

$args = array_slice($argv, 1);
if (empty($args)) {
    $args = ['--configuration', 'phpunit.xml', '--no-coverage'];
}

$status = (new PHPUnit\TextUI\Application)->run(array_merge(['phpunit'], $args));
exit($status);
