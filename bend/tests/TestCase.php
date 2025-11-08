<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Contracts\Config\Repository;

abstract class TestCase extends BaseTestCase
{
    protected function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);

        /** @var Repository $config */
        $config = $app->make('config');
        $config->set('database.default', 'sqlite');
        $config->set('database.connections.sqlite.database', ':memory:');
    }
}
